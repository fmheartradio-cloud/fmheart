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
  // CriOS / FxiOS still WebKit on iOS
  const iOSBrowser = iOS;
  return iOSBrowser || safariDesktop;
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

export function RadioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const prevMetaRef = useRef<RadioMeta>(DEFAULT_META);
  const wantPlayRef = useRef(false);
  const appleRef = useRef(false);
  const reconnectTimer = useRef<number | null>(null);
  const waitingTimer = useRef<number | null>(null);
  const watchdogTimer = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const lastProgressAt = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.85);
  const [meta, setMeta] = useState<RadioMeta>(DEFAULT_META);
  const [recent, setRecent] = useState<RecentTrack[]>([]);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

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
      gain.gain.value = volume;

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
  }, [volume]);

  const assignStream = useCallback((audio: HTMLAudioElement, url: string) => {
    audio.muted = false;
    if (appleRef.current) {
      audio.removeAttribute("crossorigin");
      audio.removeAttribute("crossOrigin");
      // Fragment busts cache without breaking Icecast query parsing
      const sep = url.includes("#") ? "" : `#${Date.now()}`;
      audio.src = `${url}${sep}`;
    } else {
      // Fresh connection on each assign — live streams die silently otherwise
      const bust =
        url.includes("?") || url.includes("#")
          ? `${url}${url.includes("?") ? "&" : "#"}t=${Date.now()}`
          : `${url}?t=${Date.now()}`;
      audio.crossOrigin = "anonymous";
      audio.src = bust;
      audio.load();
    }
  }, []);

  const startStream = useCallback(
    async (preferProxy: boolean) => {
      const audio = audioRef.current;
      if (!audio) return;

      const direct = SITE.streamUrl;
      const proxy = `${PROXY_STREAM}?t=${Date.now()}`;

      if (appleRef.current) {
        // Direct HTTPS Icecast — no Web Audio, no query bust, no load()
        audio.volume = volume;
        assignStream(audio, direct);
        await audio.play();
        return;
      }

      await ensureGraph();
      audio.volume = 1;
      const primary = preferProxy ? proxy : direct;
      const fallback = preferProxy ? direct : proxy;
      try {
        assignStream(audio, primary);
        await audio.play();
      } catch {
        audio.removeAttribute("crossOrigin");
        assignStream(audio, fallback);
        await audio.play();
      }
      if (ctxRef.current?.state === "suspended") {
        await ctxRef.current.resume();
      }
    },
    [assignStream, ensureGraph, volume],
  );

  const scheduleReconnect = useCallback(() => {
    if (!wantPlayRef.current) return;
    clearReconnect();
    clearWaitingWatch();

    const attempt = reconnectAttempts.current;
    const delay = Math.min(1000 * Math.pow(2, attempt), 12000);
    reconnectAttempts.current = attempt + 1;

    reconnectTimer.current = window.setTimeout(() => {
      if (!wantPlayRef.current || !audioRef.current) return;
      setIsLoading(true);
      setError(null);
      // Alternate proxy/direct so a dead upstream path can recover
      const preferProxy = attempt % 2 === 0;
      void startStream(preferProxy).catch(() => {
        if (!wantPlayRef.current) return;
        if (reconnectAttempts.current >= 6) {
          setError("Stream එක reconnect වුණේ නැහැ. Play නැවත ඔබන්න.");
          setIsLoading(false);
          return;
        }
        scheduleReconnect();
      });
    }, delay);
  }, [clearReconnect, clearWaitingWatch, startStream]);

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
      setIsPlaying(true);
      setIsLoading(false);
      setError(null);
      reconnectAttempts.current = 0;
      clearReconnect();
      clearWaitingWatch();
      markProgress();
    };
    const onPause = () => {
      clearWaitingWatch();
      if (!wantPlayRef.current) setIsPlaying(false);
    };
    const onWaiting = () => {
      setIsLoading(true);
      clearWaitingWatch();
      // Live Icecast often stalls without error — force reconnect if stuck
      waitingTimer.current = window.setTimeout(() => {
        if (wantPlayRef.current) scheduleReconnect();
      }, 8000);
    };
    const onCanPlay = () => {
      setIsLoading(false);
      clearWaitingWatch();
      markProgress();
    };
    const onTimeUpdate = () => markProgress();
    const onStalled = () => {
      if (wantPlayRef.current) scheduleReconnect();
    };
    const onEnded = () => {
      if (wantPlayRef.current) scheduleReconnect();
    };
    const onError = () => {
      setIsLoading(false);
      if (wantPlayRef.current) scheduleReconnect();
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

    // Catch silent freezes / unexpected pauses without an error event
    watchdogTimer.current = window.setInterval(() => {
      if (!wantPlayRef.current || !audioRef.current) return;
      if (reconnectTimer.current != null) return;
      const el = audioRef.current;

      // Stream dropped and element paused itself
      if (el.paused) {
        scheduleReconnect();
        return;
      }

      // Buffer emptied and no recovery (HAVE_CURRENT_DATA = 2)
      const stuck =
        el.readyState < 2 &&
        lastProgressAt.current > 0 &&
        Date.now() - lastProgressAt.current > 10000;
      if (stuck) scheduleReconnect();
    }, 4000);

    return () => {
      wantPlayRef.current = false;
      clearReconnect();
      clearWaitingWatch();
      if (watchdogTimer.current != null) {
        window.clearInterval(watchdogTimer.current);
        watchdogTimer.current = null;
      }
      audio.pause();
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("stalled", onStalled);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      void ctxRef.current?.close();
      ctxRef.current = null;
      analyserRef.current = null;
      gainRef.current = null;
      sourceRef.current = null;
    };
  }, [clearReconnect, clearWaitingWatch, scheduleReconnect]);

  useEffect(() => {
    if (gainRef.current && !appleRef.current) {
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

    // Mark intent synchronously inside the tap gesture
    wantPlayRef.current = true;
    reconnectAttempts.current = 0;
    lastProgressAt.current = Date.now();
    setIsLoading(true);
    setError(null);
    clearReconnect();
    clearWaitingWatch();

    try {
      // Apple: do not await anything before play() except the play promise itself
      if (appleRef.current) {
        audio.muted = false;
        audio.volume = volume;
        assignStream(audio, SITE.streamUrl);
        await audio.play();
      } else {
        await startStream(true);
      }
    } catch (err) {
      try {
        // Fallback: same-origin proxy (HTTPS) without Web Audio on Apple
        audio.muted = false;
        audio.volume = volume;
        if (appleRef.current) {
          assignStream(audio, `${PROXY_STREAM}?t=${Date.now()}`);
          await audio.play();
        } else {
          await startStream(false);
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
  }, [assignStream, clearReconnect, clearWaitingWatch, startStream, volume]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    wantPlayRef.current = false;
    reconnectAttempts.current = 0;
    clearReconnect();
    clearWaitingWatch();
    if (!audio) return;
    audio.pause();
    // Keep src on Apple so resume is faster / more reliable
    if (!appleRef.current) {
      audio.removeAttribute("src");
      audio.load();
    }
    setIsPlaying(false);
    setIsLoading(false);
  }, [clearReconnect, clearWaitingWatch]);

  const toggle = useCallback(async () => {
    if (wantPlayRef.current && (isPlaying || isLoading)) pause();
    else await play();
  }, [isPlaying, isLoading, pause, play]);

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
      {/* DOM-attached audio is required for reliable iOS playback */}
      <audio
        ref={audioRef}
        preload="none"
        playsInline
        // Keep in layout (not display:none) — opacity trick for WebKit
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
