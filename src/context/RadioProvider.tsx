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

/** Same-origin proxy — enables real FFT spectrum via Web Audio (Chromium). */
const PROXY_STREAM = "/api/radio-stream";

/**
 * Safari / all iOS browsers: createMediaElementSource on live Icecast often
 * mutes audio or returns empty analyser data. Use plain <audio> + direct URL.
 */
function useSimpleAudioPath() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safariDesktop =
    /Safari/.test(ua) &&
    !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS|OPR|Android/i.test(ua);
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

function streamUrls(simple: boolean) {
  const bust = Date.now();
  if (simple) {
    return [
      `${SITE.streamUrl}?t=${bust}`,
      `${PROXY_STREAM}?t=${bust}`,
    ];
  }
  return [
    `${PROXY_STREAM}?t=${bust}`,
    `${SITE.streamUrl}?t=${bust}`,
  ];
}

export function RadioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const prevMetaRef = useRef<RadioMeta>(DEFAULT_META);
  const wantPlayRef = useRef(false);
  const simplePathRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.85);
  const [meta, setMeta] = useState<RadioMeta>(DEFAULT_META);
  const [recent, setRecent] = useState<RecentTrack[]>([]);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const ensureGraph = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || simplePathRef.current) return;

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

  useEffect(() => {
    simplePathRef.current = useSimpleAudioPath();

    const audio = new Audio();
    audio.preload = "none";
    audio.playsInline = true;
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");

    if (!simplePathRef.current) {
      audio.crossOrigin = "anonymous";
    }

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
      if (wantPlayRef.current) {
        window.setTimeout(() => {
          if (!wantPlayRef.current || !audioRef.current) return;
          const urls = streamUrls(simplePathRef.current);
          const next = urls[0]!;
          if (simplePathRef.current) {
            audioRef.current.removeAttribute("crossOrigin");
          }
          audioRef.current.src = next;
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
    if (gainRef.current && !simplePathRef.current) {
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

  const tryPlayUrl = useCallback(async (url: string, useCors: boolean) => {
    const audio = audioRef.current;
    if (!audio) throw new Error("no audio");

    if (useCors) {
      audio.crossOrigin = "anonymous";
    } else {
      audio.removeAttribute("crossOrigin");
    }

    audio.src = url;
    audio.load();
    await audio.play();
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    wantPlayRef.current = true;
    setIsLoading(true);
    setError(null);

    const simple = simplePathRef.current;
    const urls = streamUrls(simple);

    try {
      if (simple) {
        // Plain element playback — reliable on Apple WebKit
        audio.volume = volume;
        await tryPlayUrl(urls[0]!, false);
      } else {
        // Chromium: Web Audio graph for spectrum (user-gesture resume first)
        await ensureGraph();
        audio.volume = 1;
        try {
          await tryPlayUrl(urls[0]!, true);
        } catch {
          audio.removeAttribute("crossOrigin");
          await tryPlayUrl(urls[1]!, false);
        }
        if (ctxRef.current?.state === "suspended") {
          await ctxRef.current.resume();
        }
      }
    } catch (err) {
      // Last resort: other URL
      try {
        audio.volume = simple ? volume : 1;
        await tryPlayUrl(urls[1] ?? urls[0]!, false);
        if (!simple && ctxRef.current?.state === "suspended") {
          await ctxRef.current.resume();
        }
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
  }, [ensureGraph, tryPlayUrl, volume]);

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
