"use client";

import { useRadio } from "@/context/RadioProvider";
import { PlayerAd } from "@/components/home/PlayerAd";
import { RadioSpectrum } from "@/components/home/RadioSpectrum";
import type { DirectAdBanner } from "@/types/ads";

export function LiveRadioPlayer({
  playerBanner,
}: {
  playerBanner?: DirectAdBanner | null;
}) {
  const {
    isPlaying,
    isLoading,
    error,
    meta,
    toggle,
    primeSpectrum,
    volume,
    setVolume,
  } = useRadio();

  return (
    <aside className="flex h-auto min-h-full w-full flex-col bg-fh-ink text-white">
      <div className="shrink-0 border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full bg-fh-red ${isPlaying ? "animate-live" : ""}`}
            />
            <h2 className="font-heading text-sm font-bold tracking-wider uppercase">
              Live Radio
            </h2>
          </div>
          <span className="text-xs text-neutral-400">
            {isPlaying ? "Streaming now" : "24/7 Live"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 pb-2.5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onPointerDown={() => primeSpectrum()}
            onClick={() => void toggle()}
            disabled={isLoading}
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fh-red-bright to-fh-red-dark text-2xl shadow-lg shadow-fh-red/30 transition hover:scale-105 disabled:opacity-70"
            aria-label={isPlaying ? "Pause" : "Play live radio"}
          >
            {isLoading ? "…" : isPlaying ? "❚❚" : "▶"}
          </button>
          <div className="min-w-0">
            <p className="text-[11px] tracking-wider text-neutral-400 uppercase">
              {isPlaying ? "On Air" : "Now Playing"}
            </p>
            <p className="truncate font-heading text-lg font-bold">{meta.song}</p>
            <p className="truncate text-sm text-neutral-300">{meta.artist}</p>
            <p className="mt-1 text-xs text-fh-red">
              RJ: <span className="text-white">{meta.rj}</span>
            </p>
          </div>
        </div>

        <RadioSpectrum />

        <label className="block">
          <span className="mb-1 block text-[11px] tracking-wider text-neutral-500 uppercase">
            Volume
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="w-full accent-fh-red"
          />
        </label>

        {error && (
          <p className="rounded-md bg-fh-red/20 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}

        <div className="shrink-0 pt-1">
          <PlayerAd banner={playerBanner} />
        </div>
      </div>
    </aside>
  );
}
