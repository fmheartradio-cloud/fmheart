"use client";

import { useRadio } from "@/context/RadioProvider";

export function LiveHeroControls() {
  const { isPlaying, isLoading, toggle, primeSpectrum, volume, setVolume, error, meta } =
    useRadio();

  return (
    <div className="mt-8 space-y-4">
      <button
        type="button"
        onPointerDown={() => primeSpectrum()}
        onClick={() => void toggle()}
        className="inline-flex items-center gap-3 rounded-full bg-fh-red px-7 py-3.5 font-heading text-lg font-extrabold text-white transition hover:bg-fh-red-dark"
      >
        <span className="text-xl">{isLoading ? "…" : isPlaying ? "❚❚" : "▶"}</span>
        {isLoading ? "Connecting…" : isPlaying ? "Pause Stream" : "Listen Live Now"}
      </button>
      <div className="max-w-xs">
        <label className="flex items-center gap-3 text-sm text-neutral-300">
          <span className="w-14">Volume</span>
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
      </div>
      <p className="text-sm text-neutral-400">
        Now: <span className="text-white">{meta.song}</span> — {meta.artist} · RJ{" "}
        {meta.rj}
      </p>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
