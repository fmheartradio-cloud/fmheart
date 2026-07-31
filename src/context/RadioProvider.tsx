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
  /** Apple/WebKit: simulated bars. Others: real FFT of the audible stream. */
  spectrumMode: "realtime" | "simulated";
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  /** Call on play-button pointerdown so audio + FFT start before click. */
  primeSpectrum: () => void;
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
const STALL_RECONNECT_MS = 12_000;
const WATCHDOG_MS = 5_000;
const PROGRESS_STALE_MS = 15_000;
/** Vercel serverless maxDuration ~300s — rotate earlier. External CF proxy can stay longer. */
const VERCEL_PROXY_ROTATE_MS = 195_000;
const EXTERNAL_PROXY_ROTATE_MS = 25 * 60_000;
const CROSSFADE_S = 0.7;
/** Resume instantly after a short pause; reload src after a long one. */
const PROXY_RESUME_GRACE_MS = 45_000;

function streamProxyUrl() {
  return SITE.streamProxyUrl || "/api/radio-stream";
}

function isVercelLocalProxy(url: string) {
  return url.startsWith("/") || /vercel\.app|fmheart\.lk\/api\/radio-stream/i.test(url);
}

function proxyRotateMs() {
  return isVercelLocalProxy(streamProxyUrl())
    ? VERCEL_PROXY_ROTATE_MS
    : EXTERNAL_PROXY_ROTATE_MS;
}

/** Safari + all iOS browsers (Chrome/Firefox on iOS are WebKit too). */
function isAppleWebKitPlayback() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safariDesktop =
    /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox|OPR|Android/i.test(ua);
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
  if (url.includes("?")) return `${url}&_=${t}`;
  return `${url}?_=${t}`;
}

export function RadioProvider({ children }: { children: ReactNode }) {
  /** Fallback / Apple playback element (direct Icecast, no Web Audio). */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /**
   * Non-Apple: audible playback runs through these same-origin proxy elements so
   * the analyser sees exactly the samples the listener hears (perfect FFT sync).
   * Two elements alternate so the ~5 min serverless cutoff is crossfaded, not heard.
   */
  const proxyARef = useRef<HTMLAudioElement | null>(null);
  const proxyBRef = useRef<HTMLAudioElement | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const proxySourceRef = useRef<Array<MediaElementAudioSourceNode | null>>([
    null,
    null,
  ]);
  const proxyGainRef = useRef<Array<GainNode | null>>([null, null]);
  const activeIdxRef = useRef(0);
  const graphReadyRef = useRef(false);
  const rotateTimer = useRef<number | null>(null);
  const proxyPausedAt = useRef(0);
  const usingFallbackRef = useRef(false);
  const rotateFailures = useRef(0);

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

  const scheduleReconnectRef = useRef<() => void>(() => {});
  const rotateProxyRef = useRef<() => Promise<void>>(async () => {});

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

  const proxyEl = useCallback((idx: number) => {
    return idx === 0 ? proxyARef.current : proxyBRef.current;
  }, []);

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

  const clearRotate = useCallback(() => {
    if (rotateTimer.current != null) {
      window.clearTimeout(rotateTimer.current);
      rotateTimer.current = null;
    }
  }, []);

  /** Build AudioContext + analyser + per-element crossfade gains (no network). */
  const buildGraph = useCallback((): boolean => {
    if (appleRef.current) return false;
    const els = [proxyARef.current, proxyBRef.current];
    if (!els[0] || !els[1]) return false;
    if (graphReadyRef.current) return true;

    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return false;
    if (!ctxRef.current) ctxRef.current = new Ctx();
    const ctx = ctxRef.current;

    try {
      if (!analyserRef.current) {
        const analyserNode = ctx.createAnalyser();
        analyserNode.fftSize = 2048;
        // Low smoothing keeps bars tight to the beat the listener hears
        analyserNode.smoothingTimeConstant = 0.68;
        analyserNode.minDecibels = -82;
        analyserNode.maxDecibels = -28;
        analyserRef.current = analyserNode;
        setAnalyser(analyserNode);
      }

      if (!masterGainRef.current) {
        const master = ctx.createGain();
        master.gain.value = volumeRef.current;
        analyserRef.current.connect(master);
        master.connect(ctx.destination);
        masterGainRef.current = master;
      }

      for (let i = 0; i < 2; i += 1) {
        if (proxySourceRef.current[i]) continue;
        const el = els[i]!;
        el.volume = 1;
        el.muted = false;
        const source = ctx.createMediaElementSource(el);
        const gain = ctx.createGain();
        gain.gain.value = i === activeIdxRef.current ? 1 : 0;
        source.connect(gain);
        gain.connect(analyserRef.current);
        proxySourceRef.current[i] = source;
        proxyGainRef.current[i] = gain;
      }

      graphReadyRef.current = true;
      return true;
    } catch (err) {
      console.warn("[radio] audio graph build failed:", err);
      return false;
    }
  }, []);

  const stopProxies = useCallback(() => {
    clearRotate();
    for (let i = 0; i < 2; i += 1) {
      const el = proxyEl(i);
      if (!el) continue;
      try {
        el.pause();
      } catch {
        /* ignore */
      }
    }
    proxyPausedAt.current = Date.now();
  }, [clearRotate, proxyEl]);

  /** Point an element at a fresh proxy connection and start it. */
  const openProxy = useCallback(
    async (idx: number, forceNewSrc: boolean) => {
      const el = proxyEl(idx);
      if (!el) throw new Error("proxy element missing");
      el.muted = false;
      el.volume = 1;
      el.preload = "auto";

      const hasSrc = Boolean(el.currentSrc || el.getAttribute("src"));
      const stale =
        proxyPausedAt.current > 0 &&
        Date.now() - proxyPausedAt.current > PROXY_RESUME_GRACE_MS;
      if (forceNewSrc || !hasSrc || el.error != null || stale) {
        el.src = withCacheBust(streamProxyUrl());
      }
      await el.play();
    },
    [proxyEl],
  );

  const scheduleRotate = useCallback(() => {
    clearRotate();
    rotateTimer.current = window.setTimeout(() => {
      rotateTimer.current = null;
      void rotateProxyRef.current();
    }, proxyRotateMs());
  }, [clearRotate]);

  /** Crossfade to the standby element so the serverless cutoff is inaudible. */
  const rotateProxy = useCallback(async () => {
    if (!wantPlayRef.current || appleRef.current || usingFallbackRef.current) {
      return;
    }
    const ctx = ctxRef.current;
    if (!ctx || !graphReadyRef.current) return;

    const cur = activeIdxRef.current;
    const next = cur === 0 ? 1 : 0;

    try {
      await openProxy(next, true);
    } catch (err) {
      console.warn("[radio] proxy rotate failed:", err);
      rotateFailures.current += 1;
      if (rotateFailures.current >= 3) {
        scheduleReconnectRef.current();
        return;
      }
      rotateTimer.current = window.setTimeout(() => {
        rotateTimer.current = null;
        void rotateProxyRef.current();
      }, 1500);
      return;
    }

    rotateFailures.current = 0;
    const gains = proxyGainRef.current;
    const now = ctx.currentTime;
    const gNext = gains[next];
    const gCur = gains[cur];
    if (gNext && gCur) {
      gNext.gain.cancelScheduledValues(now);
      gNext.gain.setValueAtTime(gNext.gain.value, now);
      gNext.gain.linearRampToValueAtTime(1, now + CROSSFADE_S);
      gCur.gain.cancelScheduledValues(now);
      gCur.gain.setValueAtTime(gCur.gain.value, now);
      gCur.gain.linearRampToValueAtTime(0, now + CROSSFADE_S);
    }
    activeIdxRef.current = next;

    window.setTimeout(
      () => {
        if (activeIdxRef.current === next) {
          const old = proxyEl(cur);
          try {
            old?.pause();
          } catch {
            /* ignore */
          }
        }
      },
      CROSSFADE_S * 1000 + 400,
    );

    scheduleRotate();
  }, [openProxy, proxyEl, scheduleRotate]);

  rotateProxyRef.current = rotateProxy;

  /** Direct Icecast playback (Apple, or when the proxy is unavailable). */
  const startFallbackPlayback = useCallback(async () => {
    stopProxies();
    usingFallbackRef.current = true;
    setSpectrumMode("simulated");

    const audio = audioRef.current;
    if (!audio) throw new Error("audio element missing");
    audio.muted = false;
    audio.volume = volumeRef.current;
    audio.removeAttribute("crossorigin");
    audio.removeAttribute("crossOrigin");
    audio.src = withCacheBust(SITE.streamUrl);
    try {
      audio.load();
    } catch {
      /* ignore */
    }
    await audio.play();
  }, [stopProxies]);

  /**
   * Non-Apple: play the CORS proxy through the analyser graph.
   * One stream feeds both speakers and FFT, so the bars match the beat.
   * Prefer NEXT_PUBLIC_STREAM_PROXY_URL (Cloudflare) to avoid Vercel bandwidth.
   */
  const startSyncedPlayback = useCallback(async () => {
    if (appleRef.current || !SITE.realtimeSpectrum) return false;
    if (!buildGraph()) return false;

    const ctx = ctxRef.current;
    if (!ctx) return false;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    // Silence the fallback element so nothing plays twice
    const fallback = audioRef.current;
    if (fallback && !fallback.paused) {
      fallback.pause();
      fallback.removeAttribute("src");
    }
    usingFallbackRef.current = false;

    const idx = activeIdxRef.current;
    const gains = proxyGainRef.current;
    gains[idx]?.gain.setValueAtTime(1, ctx.currentTime);
    gains[idx === 0 ? 1 : 0]?.gain.setValueAtTime(0, ctx.currentTime);
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volumeRef.current;
    }

    try {
      await openProxy(idx, false);
    } catch {
      // One cold retry with a fresh connection
      await openProxy(idx, true);
    }

    rotateFailures.current = 0;
    setSpectrumMode("realtime");
    scheduleRotate();
    return true;
  }, [buildGraph, openProxy, scheduleRotate]);

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
      reconnectTimer.current = null;
      if (!wantPlayRef.current) {
        reconnectingRef.current = false;
        return;
      }
      setIsLoading(true);
      setError(null);

      const attemptPlay = appleRef.current
        ? startFallbackPlayback()
        : startSyncedPlayback().then((ok) => {
            if (!ok) return startFallbackPlayback();
          });

      void attemptPlay
        .then(() => {
          reconnectingRef.current = false;
        })
        .catch(() => {
          reconnectingRef.current = false;
          if (!wantPlayRef.current) return;
          if (reconnectAttempts.current >= 8) {
            setError("Stream එක reconnect වුණේ නැහැ. Play නැවත ඔබන්න.");
            setIsLoading(false);
            return;
          }
          // Next retry falls back to the direct stream
          void startFallbackPlayback().catch(() => scheduleReconnect());
        });
    }, delay);
  }, [
    clearReconnect,
    clearWaitingWatch,
    startFallbackPlayback,
    startSyncedPlayback,
  ]);

  scheduleReconnectRef.current = scheduleReconnect;

  useEffect(() => {
    appleRef.current = isAppleWebKitPlayback();
    const wantRealtime = !appleRef.current && SITE.realtimeSpectrum;
    setSpectrumMode(wantRealtime ? "realtime" : "simulated");
    if (wantRealtime) {
      // Build the graph up front so Play only needs the network
      buildGraph();
    }

    const media = [audioRef.current, proxyARef.current, proxyBRef.current];
    for (const el of media) {
      if (!el) continue;
      el.preload = "none";
      (el as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
      el.setAttribute("playsinline", "");
      el.setAttribute("webkit-playsinline", "");
    }
    audioRef.current?.setAttribute("x-webkit-airplay", "allow");

    const markProgress = () => {
      lastProgressAt.current = Date.now();
    };

    const isActive = (el: EventTarget | null) => {
      const current = appleRef.current || usingFallbackRef.current
        ? audioRef.current
        : proxyEl(activeIdxRef.current);
      return el === current;
    };

    const onPlaying = (e: Event) => {
      if (!wantPlayRef.current) {
        (e.currentTarget as HTMLAudioElement | null)?.pause();
        return;
      }
      if (!isActive(e.currentTarget)) return;
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
    const onWaiting = (e: Event) => {
      if (!wantPlayRef.current || !isActive(e.currentTarget)) return;
      setIsLoading(true);
      clearWaitingWatch();
      waitingTimer.current = window.setTimeout(() => {
        if (wantPlayRef.current) scheduleReconnectRef.current();
      }, STALL_RECONNECT_MS);
    };
    const onCanPlay = (e: Event) => {
      if (!isActive(e.currentTarget)) return;
      setIsLoading(false);
      clearWaitingWatch();
      markProgress();
    };
    const onTimeUpdate = (e: Event) => {
      if (isActive(e.currentTarget)) markProgress();
    };
    const onStalled = (e: Event) => {
      if (!wantPlayRef.current || !isActive(e.currentTarget)) return;
      clearWaitingWatch();
      waitingTimer.current = window.setTimeout(() => {
        if (wantPlayRef.current) scheduleReconnectRef.current();
      }, STALL_RECONNECT_MS);
    };
    /** Serverless cutoff on the live element — hand over immediately. */
    const onDrop = (e: Event) => {
      if (!wantPlayRef.current) return;
      if (!isActive(e.currentTarget)) return;
      if (!appleRef.current && !usingFallbackRef.current) {
        clearRotate();
        void rotateProxyRef.current();
        return;
      }
      scheduleReconnectRef.current();
    };
    const onError = (e: Event) => {
      setIsLoading(false);
      if (!isActive(e.currentTarget)) return;
      if (wantPlayRef.current) {
        onDrop(e);
        return;
      }
      setIsPlaying(false);
      setError("Stream එක connect වුණේ නැහැ. නැවත try කරන්න.");
    };

    const bind = (el: HTMLAudioElement | null) => {
      if (!el) return;
      el.addEventListener("playing", onPlaying);
      el.addEventListener("pause", onPause);
      el.addEventListener("waiting", onWaiting);
      el.addEventListener("canplay", onCanPlay);
      el.addEventListener("timeupdate", onTimeUpdate);
      el.addEventListener("stalled", onStalled);
      el.addEventListener("ended", onDrop);
      el.addEventListener("error", onError);
    };
    const unbind = (el: HTMLAudioElement | null) => {
      if (!el) return;
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("stalled", onStalled);
      el.removeEventListener("ended", onDrop);
      el.removeEventListener("error", onError);
    };

    media.forEach(bind);

    watchdogTimer.current = window.setInterval(() => {
      if (!wantPlayRef.current) return;
      if (reconnectingRef.current || reconnectTimer.current != null) return;
      const el =
        appleRef.current || usingFallbackRef.current
          ? audioRef.current
          : proxyEl(activeIdxRef.current);
      if (!el) return;

      if (el.paused) {
        if (!appleRef.current && !usingFallbackRef.current) {
          void rotateProxyRef.current();
        } else {
          scheduleReconnectRef.current();
        }
        return;
      }

      const stale =
        lastProgressAt.current > 0 &&
        Date.now() - lastProgressAt.current > PROGRESS_STALE_MS;
      if (stale && el.readyState < 2) scheduleReconnectRef.current();
    }, WATCHDOG_MS);

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!wantPlayRef.current) return;
      const el =
        appleRef.current || usingFallbackRef.current
          ? audioRef.current
          : proxyEl(activeIdxRef.current);
      if (!el) return;
      if (el.paused) scheduleReconnectRef.current();
      else void el.play().catch(() => scheduleReconnectRef.current());
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (watchdogTimer.current != null) {
        window.clearInterval(watchdogTimer.current);
        watchdogTimer.current = null;
      }
      media.forEach(unbind);
    };
  }, [buildGraph, clearReconnect, clearRotate, clearWaitingWatch, proxyEl]);

  // True unmount cleanup only
  useEffect(() => {
    return () => {
      wantPlayRef.current = false;
      clearReconnect();
      clearWaitingWatch();
      clearRotate();
      const els = [audioRef.current, proxyARef.current, proxyBRef.current];
      for (const el of els) {
        if (!el) continue;
        el.pause();
        el.removeAttribute("src");
      }
      void ctxRef.current?.close();
      ctxRef.current = null;
      analyserRef.current = null;
      masterGainRef.current = null;
      proxySourceRef.current = [null, null];
      proxyGainRef.current = [null, null];
      graphReadyRef.current = false;
    };
  }, [clearReconnect, clearRotate, clearWaitingWatch]);

  useEffect(() => {
    if (!appleRef.current && !usingFallbackRef.current && masterGainRef.current) {
      masterGainRef.current.gain.value = volume;
      return;
    }
    if (audioRef.current) audioRef.current.volume = volume;
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
    wantPlayRef.current = true;
    reconnectAttempts.current = 0;
    reconnectingRef.current = false;
    rotateFailures.current = 0;
    lastProgressAt.current = Date.now();
    setIsLoading(true);
    setError(null);
    clearReconnect();
    clearWaitingWatch();

    try {
      if (appleRef.current) {
        await startFallbackPlayback();
        return;
      }
      const ok = await startSyncedPlayback();
      if (!ok) await startFallbackPlayback();
    } catch (err) {
      try {
        await startFallbackPlayback();
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
  }, [
    clearReconnect,
    clearWaitingWatch,
    startFallbackPlayback,
    startSyncedPlayback,
  ]);

  const pause = useCallback(() => {
    wantPlayRef.current = false;
    reconnectAttempts.current = 0;
    reconnectingRef.current = false;
    clearReconnect();
    clearWaitingWatch();
    stopProxies();

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      if (usingFallbackRef.current && !appleRef.current) {
        audio.removeAttribute("src");
        audio.load();
      }
    }
    setIsPlaying(false);
    setIsLoading(false);
  }, [clearReconnect, clearWaitingWatch, stopProxies]);

  const toggle = useCallback(async () => {
    // Intent flag only — avoids resume/pause races with loading UI state
    if (wantPlayRef.current) pause();
    else await play();
  }, [pause, play]);

  /** pointerdown on Play — unlock AudioContext inside the gesture. */
  const primeSpectrum = useCallback(() => {
    if (appleRef.current || wantPlayRef.current) return;
    if (buildGraph()) {
      void ctxRef.current?.resume();
    }
  }, [buildGraph]);

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
      primeSpectrum,
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
      primeSpectrum,
      setVolume,
    ],
  );

  return (
    <RadioContext.Provider value={value}>
      {/* Direct Icecast — Apple playback and non-Apple fallback */}
      <audio
        ref={audioRef}
        preload="none"
        playsInline
        className="pointer-events-none fixed top-0 left-0 h-px w-px opacity-0"
        aria-hidden
      />
      {/* Same-origin proxy pair: audible playback + analyser source (perfectly in sync) */}
      <audio
        ref={proxyARef}
        preload="none"
        playsInline
        crossOrigin="anonymous"
        className="pointer-events-none fixed top-0 left-0 h-px w-px opacity-0"
        aria-hidden
      />
      <audio
        ref={proxyBRef}
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
