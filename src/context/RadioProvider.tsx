"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SITE } from "@/lib/site";

export type RadioMeta = {
  song: string;
  artist: string;
  rj: string;
  isLive: boolean;
};

export type RecentTrack = {
  title: string;
  artist: string;
  time: string;
};

type RadioContextValue = {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  volume: number;
  meta: RadioMeta;
  recent: RecentTrack[];
  analyser: AnalyserNode | null;
  /** Apple/WebKit: simulated bars. Others: real FFT when analyser is live. */
  spectrumMode: "realtime" | "simulated";
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  setVolume: (v: number) => void;
};

const RadioContext = createContext<RadioContextValue | null>(null);

const DEFAULT_META: RadioMeta = {
  song: "FM Heart Live",
  artist: "On Air",
  rj: "FM Heart",
  isLive: true,
};

const POLL_MS = 15_000;
const MAX_RECENT = 8;
const PROXY_STREAM = "/api/radio-stream";
/** Vercel serverless proxy dies around maxDuration — never rely on it for long listens. */
const STALL_RECONNECT_MS = 12_000;
const WATCHDOG_MS = 5_000;
const PROGRESS_STALE_MS = 15_000;

/** Safari + all iOS browsers (Chrome/Firefox on iOS are WebKit too). */
function isAppleWebKitPlayback() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safariDesktop =
    /Safari/.test(ua) &&
    !/Chrome|Chromium|Edg|Firefox|OPR|Android/i.test(ua);
  return iOS || safariDesktop;
}

function formatClock(d = new Date()) {
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function trackKey(song: string, artist: string) {
  return `${song.trim().toLowerCase()}::${artist.trim().toLowerCase()}`;
}

function withCacheBust(url: string) {
  const t = Date.now();
  if (url.includes("#")) return `${url}&_=${t}`;
  if (url.includes("?")) return `${url}&_=${t}`;
  return `${url}?_=${t}`;
}

export function RadioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const prevMetaRef = useRef<RadioMeta>(DEFAULT_META);
  const wantPlayRef = useRef(false);
  const appleRef = useRef(false);
  const volumeRef = useRef(0.85);
  const reconnectTimer = useRef<number | null>(null);
  const waitingTimer = useRef<number | null>(null);
  const watchdogTimer = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const lastProgressAt = useRef(0);
  const reconnectingRef = useRef(false);
  const usingProxyRef = useRef(false);
  const spectrumAudioRef = useRef<HTMLAudioElement | null>(null);
  const spectrumGraphReadyRef = useRef(false);
  const spectrumReconnectTimer = useRef<number | null>(null);
  const startStreamRef = useRef<(preferProxy: boolean) => Promise<void>>(
    async () => {},
  );
  const scheduleReconnectRef = useRef<() => void>(() => {});
  const ensureSpectrumTapRef = useRef<() => Promise<void>>(async () => {});

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.85);
  const [meta, setMeta] = useState<RadioMeta>(DEFAULT_META);
  const [recent, setRecent] = useState<RecentTrack[]>([]);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [spectrumMode, setSpectrumMode] = useState<"realtime" | "simulated">(
    "simulated",
  );

  volumeRef.current = volume;

  const clearWaitingWatch = useCallback(() => {
    if (waitingTimer.current != null) {
      window.clearTimeout(waitingTimer.current);
      waitingTimer.current = null;
    }
  }, []);

  const clearReconnect = useCallback(() => {
    if (reconnectTimer.current != null) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  /**
   * Real FFT on non-Apple: audible playback stays on direct Icecast (no CORS).
   * A second same-origin /api/radio-stream element feeds MediaElementSource → Analyser.
   * Must NOT mute that element — muted media yields silent FFT in Chromium.
   * Route analyser → gain(0) → destination so the graph stays active without double audio.
   * Proxy may drop ~5 min — reconnect spectrum tap only; main audio keeps playing.
   */
  const stopSpectrumTap = useCallback(() => {
    if (spectrumReconnectTimer.current != null) {
      window.clearTimeout(spectrumReconnectTimer.current);
      spectrumReconnectTimer.current = null;
    }
    const el = spectrumAudioRef.current;
    if (!el) return;
    try {
      el.pause();
      // Keep src so next play can resume without a cold proxy reconnect
    } catch {
      /* ignore */
    }
  }, []);

  /** Build AudioContext + Analyser + MediaElementSource early (no network yet). */
  const warmSpectrumGraph = useCallback(async () => {
    if (appleRef.current || gainRef.current) return;
    const spectrum = spectrumAudioRef.current;
    if (!spectrum) return;

    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!ctxRef.current) {
      ctxRef.current = new Ctx();
    }
    const ctx = ctxRef.current;

    if (!analyserRef.current) {
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 2048;
      analyserNode.smoothingTimeConstant = 0.72;
      analyserNode.minDecibels = -82;
      analyserNode.maxDecibels = -28;
      analyserRef.current = analyserNode;
      setAnalyser(analyserNode);
    }

    if (!spectrumGraphReadyRef.current) {
      try {
        const source = ctx.createMediaElementSource(spectrum);
        const silent = ctx.createGain();
        silent.gain.value = 0;
        source.connect(analyserRef.current);
        analyserRef.current.connect(silent);
        silent.connect(ctx.destination);
        sourceRef.current = source;
        spectrumGraphReadyRef.current = true;
      } catch (err) {
        console.warn("[radio] spectrum MediaElementSource failed:", err);
        setSpectrumMode("simulated");
      }
    }
  }, []);

  const ensureSpectrumTap = useCallback(async () => {
    if (appleRef.current) return;
    if (gainRef.current) {
      setSpectrumMode("realtime");
      return;
    }

    const spectrum = spectrumAudioRef.current;
    if (!spectrum) return;

    await warmSpectrumGraph();
    const ctx = ctxRef.current;
    if (!ctx || !analyserRef.current || !spectrumGraphReadyRef.current) {
      setSpectrumMode("simulated");
      return;
    }
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    // Never mute — muted MediaElementSource output is all zeros in Chromium
    spectrum.muted = false;
    spectrum.volume = 1;
    // Only reassign src when needed — reuse buffer on quick pause/play
    const needNewSrc =
      !spectrum.src ||
      spectrum.paused ||
      spectrum.error != null ||
      spectrum.readyState < 2;
    if (needNewSrc) {
      spectrum.src = withCacheBust(PROXY_STREAM);
    }
    try {
      await spectrum.play();
      // Show realtime immediately — don't wait for verify delay
      setSpectrumMode("realtime");
    } catch (err) {
      console.warn("[radio] spectrum tap play failed:", err);
      setSpectrumMode("simulated");
      return;
    }

    const verify = (attempt: number) => {
      spectrumReconnectTimer.current = null;
      if (!wantPlayRef.current || appleRef.current) return;
      const an = analyserRef.current;
      if (!an) return;
      const buf = new Uint8Array(an.frequencyBinCount);
      an.getByteFrequencyData(buf);
      let energy = 0;
      for (let i = 0; i < buf.length; i++) energy += buf[i]!;
      if (energy > 0) {
        setSpectrumMode("realtime");
        return;
      }
      if (attempt < 3) {
        spectrumReconnectTimer.current = window.setTimeout(
          () => verify(attempt + 1),
          350,
        );
        return;
      }
      if (attempt === 3 && spectrumAudioRef.current) {
        spectrumAudioRef.current.src = withCacheBust(PROXY_STREAM);
        void spectrumAudioRef.current
          .play()
          .then(() => {
            spectrumReconnectTimer.current = window.setTimeout(
              () => verify(4),
              400,
            );
          })
          .catch(() => setSpectrumMode("simulated"));
        return;
      }
      setSpectrumMode("simulated");
    };

    if (spectrumReconnectTimer.current != null) {
      window.clearTimeout(spectrumReconnectTimer.current);
    }
    // First energy check quickly — proxy usually has bytes within ~300ms
    spectrumReconnectTimer.current = window.setTimeout(() => verify(0), 280);
  }, [warmSpectrumGraph]);

  /** Legacy: when direct Icecast fails, play via proxy + Web Audio graph. */
  const ensureGraph = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || appleRef.current) return;

    if (!ctxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 2048;
      analyserNode.smoothingTimeConstant = 0.72;
      analyserNode.minDecibels = -82;
      analyserNode.maxDecibels = -28;

      const gain = ctx.createGain();
      gain.gain.value = volumeRef.current;

      stopSpectrumTap();
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyserNode);
      analyserNode.connect(gain);
      gain.connect(ctx.destination);

      ctxRef.current = ctx;
      analyserRef.current = analyserNode;
      gainRef.current = gain;
      sourceRef.current = source;
      setAnalyser(analyserNode);
      setSpectrumMode("realtime");
    }

    if (ctxRef.current.state === "suspended") {
      await ctxRef.current.resume();
    }
  }, [stopSpectrumTap]);

  const assignStream = useCallback(
    (audio: HTMLAudioElement, url: string, mode: "direct" | "proxy") => {
      audio.muted = false;
      usingProxyRef.current = mode === "proxy";

      if (appleRef.current) {
        audio.removeAttribute("crossorigin");
        audio.removeAttribute("crossOrigin");
        audio.src = `${url}${url.includes("#") ? "" : `#${Date.now()}`}`;
        return;
      }

      if (mode === "proxy") {
        // CORS-enabled same-origin proxy (needed only for Web Audio analyser)
        audio.crossOrigin = "anonymous";
        audio.src = withCacheBust(url);
        audio.load();
        return;
      }

      // Direct Icecast — no CORS attribute (host does not send ACAO)
      audio.removeAttribute("crossorigin");
      audio.removeAttribute("crossOrigin");
      audio.src = withCacheBust(url);
      // Avoid load() when possible — it can cancel and flash silence
      try {
        audio.load();
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const startStream = useCallback(
    async (preferProxy: boolean) => {
      const audio = audioRef.current;
      if (!audio) return;
      const vol = volumeRef.current;

      const direct = SITE.streamUrl;
      const proxy = `${PROXY_STREAM}?t=${Date.now()}`;

      if (appleRef.current) {
        audio.volume = vol;
        assignStream(audio, direct, "direct");
        await audio.play();
        return;
      }

      // Stable path: direct stream, element volume (no Web Audio / no Vercel proxy)
      if (!preferProxy) {
        audio.volume = vol;
        assignStream(audio, direct, "direct");
        await audio.play();
        return;
      }

      // Proxy path only as short fallback (analyser + CORS); expect periodic reconnect
      await ensureGraph();
      audio.volume = 1;
      try {
        assignStream(audio, proxy, "proxy");
        await audio.play();
      } catch {
        audio.volume = vol;
        assignStream(audio, direct, "direct");
        await audio.play();
      }
      if (ctxRef.current?.state === "suspended") {
        await ctxRef.current.resume();
      }
    },
    [assignStream, ensureGraph],
  );

  const scheduleReconnect = useCallback(() => {
    if (!wantPlayRef.current) return;
    if (reconnectingRef.current && reconnectTimer.current != null) return;

    clearReconnect();
    clearWaitingWatch();
    reconnectingRef.current = true;

    const attempt = reconnectAttempts.current;
    const delay = Math.min(800 * Math.pow(1.6, attempt), 8000);
    reconnectAttempts.current = attempt + 1;

    reconnectTimer.current = window.setTimeout(() => {
      if (!wantPlayRef.current || !audioRef.current) {
        reconnectingRef.current = false;
        return;
      }
      setIsLoading(true);
      setError(null);
      // Always prefer direct after drops — proxy times out on Vercel
      void startStream(false)
        .then(() => {
          reconnectingRef.current = false;
        })
        .catch(() => {
          if (!wantPlayRef.current) {
            reconnectingRef.current = false;
            return;
          }
          if (reconnectAttempts.current >= 8) {
            setError("Stream එක reconnect වුණේ නැහැ. Play නැවත ඔබන්න.");
            setIsLoading(false);
            reconnectingRef.current = false;
            return;
          }
          reconnectingRef.current = false;
          scheduleReconnect();
        });
    }, delay);
  }, [clearReconnect, clearWaitingWatch, startStream]);

  startStreamRef.current = startStream;
  scheduleReconnectRef.current = scheduleReconnect;
  ensureSpectrumTapRef.current = ensureSpectrumTap;

  useEffect(() => {
    appleRef.current = isAppleWebKitPlayback();
    setSpectrumMode(appleRef.current ? "simulated" : "realtime");
    // Pre-build Web Audio graph so first Play only needs to open the proxy
    if (!appleRef.current) {
      void warmSpectrumGraph();
    }
    const audio = audioRef.current;
    if (!audio) return;

    audio.preload = "none";
    (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
    audio.setAttribute("playsinline", "");
    audio.setAttribute("webkit-playsinline", "");
    audio.setAttribute("x-webkit-airplay", "allow");

    const markProgress = () => {
      lastProgressAt.current = Date.now();
    };

    const onPlaying = () => {
      // Ignore unexpected resume after intentional pause
      if (!wantPlayRef.current) {
        audio.pause();
        return;
      }
      setIsPlaying(true);
      setIsLoading(false);
      setError(null);
      reconnectAttempts.current = 0;
      reconnectingRef.current = false;
      clearReconnect();
      clearWaitingWatch();
      markProgress();
      // Real FFT via muted same-origin spectrum tap (non-Apple)
      if (!appleRef.current) {
        void ensureSpectrumTapRef.current();
      }
    };
    const onPause = () => {
      clearWaitingWatch();
      if (!wantPlayRef.current) setIsPlaying(false);
    };
    const onWaiting = () => {
      if (!wantPlayRef.current) return;
      setIsLoading(true);
      clearWaitingWatch();
      waitingTimer.current = window.setTimeout(() => {
        if (wantPlayRef.current) scheduleReconnectRef.current();
      }, STALL_RECONNECT_MS);
    };
    const onCanPlay = () => {
      setIsLoading(false);
      clearWaitingWatch();
      markProgress();
    };
    const onTimeUpdate = () => markProgress();
    const onStalled = () => {
      if (!wantPlayRef.current) return;
      clearWaitingWatch();
      waitingTimer.current = window.setTimeout(() => {
        if (wantPlayRef.current) scheduleReconnectRef.current();
      }, STALL_RECONNECT_MS);
    };
    const onEnded = () => {
      if (wantPlayRef.current) scheduleReconnectRef.current();
    };
    const onError = () => {
      setIsLoading(false);
      if (wantPlayRef.current) scheduleReconnectRef.current();
      else {
        setIsPlaying(false);
        setError("Stream එක connect වුණේ නැහැ. නැවත try කරන්න.");
      }
    };

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("stalled", onStalled);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    watchdogTimer.current = window.setInterval(() => {
      // Never auto-resume after an intentional pause
      if (!wantPlayRef.current || !audioRef.current) return;
      if (reconnectingRef.current || reconnectTimer.current != null) return;
      const el = audioRef.current;

      if (el.paused) {
        scheduleReconnectRef.current();
        return;
      }

      const stale =
        lastProgressAt.current > 0 &&
        Date.now() - lastProgressAt.current > PROGRESS_STALE_MS;
      const bufferEmpty = el.readyState < 2;
      if (stale && bufferEmpty) scheduleReconnectRef.current();
    }, WATCHDOG_MS);

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!wantPlayRef.current || !audioRef.current) return;
      if (audioRef.current.paused) scheduleReconnectRef.current();
      else
        void audioRef.current
          .play()
          .catch(() => scheduleReconnectRef.current());
    };
    document.addEventListener("visibilitychange", onVisibility);

    const spectrum = spectrumAudioRef.current;
    const onSpectrumDrop = () => {
      if (!wantPlayRef.current || appleRef.current || gainRef.current) return;
      if (spectrumReconnectTimer.current != null) return;
      spectrumReconnectTimer.current = window.setTimeout(() => {
        spectrumReconnectTimer.current = null;
        if (wantPlayRef.current) void ensureSpectrumTapRef.current();
      }, 400);
    };
    if (spectrum) {
      spectrum.addEventListener("error", onSpectrumDrop);
      spectrum.addEventListener("ended", onSpectrumDrop);
      spectrum.addEventListener("stalled", onSpectrumDrop);
    }

    return () => {
      // Listener teardown only — do NOT pause / clear wantPlay here.
      // Volume changes used to recreate this effect and kill playback.
      document.removeEventListener("visibilitychange", onVisibility);
      if (watchdogTimer.current != null) {
        window.clearInterval(watchdogTimer.current);
        watchdogTimer.current = null;
      }
      if (spectrum) {
        spectrum.removeEventListener("error", onSpectrumDrop);
        spectrum.removeEventListener("ended", onSpectrumDrop);
        spectrum.removeEventListener("stalled", onSpectrumDrop);
      }
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("stalled", onStalled);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [clearReconnect, clearWaitingWatch, warmSpectrumGraph]);

  // True unmount cleanup only
  useEffect(() => {
    return () => {
      wantPlayRef.current = false;
      clearReconnect();
      clearWaitingWatch();
      stopSpectrumTap();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
      }
      void ctxRef.current?.close();
      ctxRef.current = null;
      analyserRef.current = null;
      gainRef.current = null;
      sourceRef.current = null;
    };
  }, [clearReconnect, clearWaitingWatch, stopSpectrumTap]);

  useEffect(() => {
    if (gainRef.current && usingProxyRef.current && !appleRef.current) {
      gainRef.current.gain.value = volume;
    } else if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const updateFromApi = useCallback(
    (song: string, artist: string, rj: string) => {
      const next: RadioMeta = { song, artist, rj, isLive: true };
      const nextKey = trackKey(song, artist);
      const prev = prevMetaRef.current;
      const prevKey = trackKey(prev.song, prev.artist);

      if (
        prevKey &&
        prevKey !== nextKey &&
        prevKey !== trackKey(DEFAULT_META.song, DEFAULT_META.artist)
      ) {
        setRecent((list) => {
          const entry: RecentTrack = {
            title: prev.song,
            artist: prev.artist,
            time: formatClock(),
          };
          const filtered = list.filter(
            (t) => trackKey(t.title, t.artist) !== prevKey,
          );
          return [entry, ...filtered].slice(0, MAX_RECENT);
        });
      }

      prevMetaRef.current = next;
      setMeta(next);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/now-playing", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          song?: string;
          artist?: string;
          rj?: string;
        };
        if (cancelled || !data.song) return;
        updateFromApi(
          data.song,
          data.artist || "FM Heart",
          data.rj || "FM Heart",
        );
      } catch {
        /* keep last known meta */
      }
    };

    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [updateFromApi]);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    const vol = volumeRef.current;

    wantPlayRef.current = true;
    reconnectAttempts.current = 0;
    reconnectingRef.current = false;
    lastProgressAt.current = Date.now();
    setIsLoading(true);
    setError(null);
    clearReconnect();
    clearWaitingWatch();

    try {
      if (appleRef.current) {
        audio.muted = false;
        audio.volume = vol;
        assignStream(audio, SITE.streamUrl, "direct");
        await audio.play();
      } else {
        // Start FFT proxy + audible stream together (cuts ~1–2s off spectrum delay)
        await Promise.all([startStream(false), ensureSpectrumTap()]);
      }
    } catch (err) {
      try {
        audio.muted = false;
        audio.volume = vol;
        if (appleRef.current) {
          assignStream(audio, `${PROXY_STREAM}?t=${Date.now()}`, "direct");
          await audio.play();
        } else {
          // Last resort: proxy (may drop after a few minutes)
          await startStream(true);
        }
      } catch (err2) {
        wantPlayRef.current = false;
        setIsLoading(false);
        setIsPlaying(false);
        const name = err2 instanceof DOMException ? err2.name : "";
        if (name === "NotAllowedError") {
          setError(
            "Browser එකේ autoplay block කරලා තියෙනවා. Play නැවත touch කරන්න.",
          );
        } else {
          setError("Play කිරීම අසාර්ථකයි. නැවත try කරන්න.");
        }
        void err;
      }
    }
  }, [assignStream, clearReconnect, clearWaitingWatch, ensureSpectrumTap, startStream]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    wantPlayRef.current = false;
    reconnectAttempts.current = 0;
    reconnectingRef.current = false;
    clearReconnect();
    clearWaitingWatch();
    stopSpectrumTap();
    if (!audio) return;
    audio.pause();
    if (!appleRef.current) {
      audio.removeAttribute("src");
      audio.load();
    }
    setIsPlaying(false);
    setIsLoading(false);
  }, [clearReconnect, clearWaitingWatch, stopSpectrumTap]);

  const toggle = useCallback(async () => {
    // Intent flag only — avoids resume/pause races with loading UI state
    if (wantPlayRef.current) pause();
    else await play();
  }, [pause, play]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.min(1, Math.max(0, v)));
  }, []);

  const value = useMemo(
    () => ({
      isPlaying,
      isLoading,
      error,
      volume,
      meta,
      recent,
      analyser,
      spectrumMode,
      play,
      pause,
      toggle,
      setVolume,
    }),
    [
      isPlaying,
      isLoading,
      error,
      volume,
      meta,
      recent,
      analyser,
      spectrumMode,
      play,
      pause,
      toggle,
      setVolume,
    ],
  );

  return (
    <RadioContext.Provider value={value}>
      <audio
        ref={audioRef}
        preload="none"
        playsInline
        className="pointer-events-none fixed top-0 left-0 h-px w-px opacity-0"
        aria-hidden
      />
      {/* Same-origin proxy feed for real FFT (non-Apple). Not muted — mute zeros FFT. */}
      <audio
        ref={spectrumAudioRef}
        preload="none"
        playsInline
        crossOrigin="anonymous"
        className="pointer-events-none fixed top-0 left-0 h-px w-px opacity-0"
        aria-hidden
      />
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be used within RadioProvider");
  return ctx;
}
