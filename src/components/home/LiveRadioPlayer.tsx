"use client";

import Link from "next/link";
import { useRadio } from "@/context/RadioProvider";
import { SITE } from "@/lib/site";
import { RadioSpectrum } from "@/components/home/RadioSpectrum";

export function LiveRadioPlayer() {
  const {
    isPlaying,
    isLoading,
    error,
    meta,
    recent,
    toggle,
    volume,
    setVolume,
  } = useRadio();

  return (
    <aside className="flex h-full w-full flex-col bg-fh-ink text-white">
      <div className="border-b border-white/10 px-4 py-3">
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

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
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

        <div>
          <p className="mb-2 text-[11px] tracking-wider text-neutral-500 uppercase">
            Recently Played
          </p>
          {recent.length > 0 && (
            <ul className="space-y-2">
              {recent.map((track) => (
                <li
                  key={`${track.title}-${track.artist}-${track.time}`}
                  className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <span className="text-neutral-200">{track.title}</span>
                    <span className="text-neutral-500"> — {track.artist}</span>
                  </span>
                  <span className="shrink-0 text-xs text-neutral-500">
                    {track.time}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-auto grid gap-2">
          <Link
            href="/live"
            className="rounded-md border border-white/20 py-2.5 text-center font-heading text-sm font-bold tracking-wide transition hover:bg-white/10"
          >
            FULL PLAYER
          </Link>
          <a
            href={`https://wa.me/${SITE.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-fh-whatsapp py-2.5 text-center font-heading text-sm font-bold text-fh-black transition hover:brightness-110"
          >
            WhatsApp Request
          </a>
        </div>
      </div>
    </aside>
  );
}
