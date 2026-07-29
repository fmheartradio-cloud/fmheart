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
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
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
  const startStreamRef = useRef<(preferProxy: boolean) => Promise<void>>(
    async () => {},
  );
  const scheduleReconnectRef = useRef<() => void>(() => {});

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.85);
  const [meta, setMeta] = useState<RadioMeta>(DEFAULT_META);
  const [recent, setRecent] = useState<RecentTrack[]>([]);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

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
   * Web Audio needs CORS. Upstream Icecast has no CORS, so analyser only works
   * via same-origin proxy — which Vercel kills after a few minutes.
   * Prefer direct playback without Web Audio for uninterrupted listening.
   */
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
      analyserNode.fftSize = 1024;
      analyserNode.smoothingTimeConstant = 0.72;
      analyserNode.minDecibels = -78;
      analyserNode.maxDecibels = -10;

      const gain = ctx.createGain();
      gain.gain.value = volumeRef.current;

      const source = ctx.createMediaElementSource(audio);
      source.connect(analyserNode);
      analyserNode.connect(gain);
      gain.connect(ctx.destination);

      ctxRef.current = ctx;
      analyserRef.current = analyserNode;
      gainRef.current = gain;
      sourceRef.current = source;
      setAnalyser(analyserNode);
    }

    if (ctxRef.current.state === "suspended") {
      await ctxRef.current.resume();
    }
  }, []);

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

  useEffect(() => {
    appleRef.current = isAppleWebKitPlayback();
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

    return () => {
      // Listener teardown only — do NOT pause / clear wantPlay here.
      // Volume changes used to recreate this effect and kill playback.
      document.removeEventListener("visibilitychange", onVisibility);
      if (watchdogTimer.current != null) {
        window.clearInterval(watchdogTimer.current);
        watchdogTimer.current = null;
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
  }, [clearReconnect, clearWaitingWatch]);

  // True unmount cleanup only
  useEffect(() => {
    return () => {
      wantPlayRef.current = false;
      clearReconnect();
      clearWaitingWatch();
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
  }, [clearReconnect, clearWaitingWatch]);

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
        // Direct Icecast first — avoids Vercel proxy ~5 min cutoff
        await startStream(false);
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
  }, [assignStream, clearReconnect, clearWaitingWatch, startStream]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    wantPlayRef.current = false;
    reconnectAttempts.current = 0;
    reconnectingRef.current = false;
    clearReconnect();
    clearWaitingWatch();
    if (!audio) return;
    audio.pause();
    if (!appleRef.current) {
      audio.removeAttribute("src");
      audio.load();
    }
    setIsPlaying(false);
    setIsLoading(false);
  }, [clearReconnect, clearWaitingWatch]);

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
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be used within RadioProvider");
  return ctx;
}
