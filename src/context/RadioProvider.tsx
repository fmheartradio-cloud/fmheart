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

/** Same-origin proxy — enables real FFT spectrum via Web Audio. */
const PROXY_STREAM = "/api/radio-stream";

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

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.85);
  const [meta, setMeta] = useState<RadioMeta>(DEFAULT_META);
  const [recent, setRecent] = useState<RecentTrack[]>([]);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const ensureGraph = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

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

      // createMediaElementSource can only be called once per element
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

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    // Same-origin proxy → Web Audio analyser works (no CORS needed)
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const onPlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
      setError(null);
    };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      // Auto-reconnect once if user still wants play (proxy timeout / drop)
      if (wantPlayRef.current) {
        window.setTimeout(() => {
          if (!wantPlayRef.current || !audioRef.current) return;
          audioRef.current.src = `${PROXY_STREAM}?t=${Date.now()}`;
          audioRef.current.load();
          void audioRef.current.play().catch(() => {
            setError("Stream එක connect වුණේ නැහැ. නැවත try කරන්න.");
          });
        }, 1200);
      } else {
        setError("Stream එක connect වුණේ නැහැ. නැවත try කරන්න.");
      }
    };

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);

    return () => {
      wantPlayRef.current = false;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
      void ctxRef.current?.close();
      ctxRef.current = null;
      analyserRef.current = null;
      gainRef.current = null;
      sourceRef.current = null;
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = volume;
    } else if (audioRef.current && !sourceRef.current) {
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
    wantPlayRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      await ensureGraph();
      // Prefer same-origin proxy for analyser; fall back to direct stream
      audio.volume = 1;
      audio.src = `${PROXY_STREAM}?t=${Date.now()}`;
      audio.load();
      await audio.play();
    } catch (err) {
      // Fallback: direct Icecast (spectrum may be flat without CORS)
      try {
        audio.removeAttribute("crossOrigin");
        audio.src = `${SITE.streamUrl}?t=${Date.now()}`;
        audio.load();
        await audio.play();
      } catch (err2) {
        wantPlayRef.current = false;
        setIsLoading(false);
        setIsPlaying(false);
        const name = err2 instanceof DOMException ? err2.name : "";
        if (name === "NotAllowedError") {
          setError(
            "Browser එකේ autoplay block කරලා තියෙනවා. Play නැවත touch/click කරන්න.",
          );
        } else {
          setError("Play කිරීම අසාර්ථකයි. නැවත try කරන්න.");
        }
        void err;
      }
    }
  }, [ensureGraph]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    wantPlayRef.current = false;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  const toggle = useCallback(async () => {
    if (isPlaying) pause();
    else await play();
  }, [isPlaying, pause, play]);

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
    <RadioContext.Provider value={value}>{children}</RadioContext.Provider>
  );
}

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be used within RadioProvider");
  return ctx;
}
