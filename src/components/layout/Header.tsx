"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { useRadio } from "@/context/RadioProvider";
import { useUi } from "@/context/UiProvider";
import { SITE } from "@/lib/site";

const MAIN_NAV_LINKS = [
  { href: "/", label: "මුල් පිටුව" },
  { href: "/live", label: "LIVE RADIO" },
  { href: "/news", label: "උණුසුම් පුවත්" },
  { href: "/news?category=%E0%B6%9A%E0%B7%8A%E2%80%8D%E0%B6%BB%E0%B7%93%E0%B6%A9%E0%B7%8F", label: "ක්‍රීඩා" },
  { href: "/news?category=%E0%B7%80%E0%B7%8A%E2%80%8D%E0%B6%BA%E0%B7%8F%E0%B6%B4%E0%B7%8F%E0%B6%BB", label: "ව්‍යාපාරික" },
  { href: "/news?category=%E0%B7%80%E0%B7%92%E0%B6%AF%E0%B7%99%E0%B7%83%E0%B7%8A", label: "විදෙස්" },
  { href: "/gossip", label: "GOSSIP" },
  { href: "/videos", label: "VIDEOS" },
  { href: "/promotion", label: "PROMOTION" },
  { href: "/advertise", label: "ADVERTISE" },
  { href: "/contact", label: "CONTACT" },
] as const;

function BrandNowPlaying({
  isPlaying,
  song,
  artist,
}: {
  isPlaying: boolean;
  song: string;
  artist?: string;
}) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <p className="truncate font-sigiri text-[15px] font-extrabold leading-none tracking-wide whitespace-nowrap text-fh-ink sm:text-[20px] md:text-[28px] lg:text-[34px]">
        {SITE.taglineSi}
      </p>
      <p className="mt-0.5 truncate text-[9px] text-fh-muted sm:text-[11px] md:text-xs">
        <span className="font-semibold text-fh-red">
          {isPlaying ? "ON AIR" : "NOW PLAYING"}
        </span>
        <span className="mx-1 text-neutral-300 md:mx-1.5">·</span>
        <span>
          {song}
          {artist ? ` — ${artist}` : ""}
        </span>
      </p>
    </div>
  );
}

export function Header() {
  const { menuOpen, setMenuOpen } = useUi();
  const [searchOpen, setSearchOpen] = useState(false);
  const { isPlaying, isLoading, toggle, meta } = useRadio();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-3 md:gap-4 md:px-4 md:py-3">
        <div className="flex shrink-0 items-center">
          <Logo variant="tagline" />
        </div>

        <BrandNowPlaying
          isPlaying={isPlaying}
          song={meta.song}
          artist={meta.artist}
        />

        <div className="flex shrink-0 items-center gap-1.5 md:gap-3">
          <Link
            href="/promotion"
            className="hidden rounded-md border border-neutral-200 px-3 py-2 font-heading text-xs font-bold tracking-wide text-fh-ink transition hover:border-fh-red hover:text-fh-red xl:inline-flex"
          >
            PROMOTE WITH US
          </Link>

          <button
            type="button"
            onClick={() => void toggle()}
            className="group inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-fh-red to-fh-red-dark px-2 py-1 text-white shadow-sm transition hover:brightness-110 sm:gap-1.5 sm:px-2.5 sm:py-1.5 md:gap-2 md:px-4 md:py-2"
            aria-label={isPlaying ? "Pause live radio" : "Play live radio"}
          >
            <span
              className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-white animate-live md:h-2.5 md:w-2.5"
              aria-hidden
            />
            <span className="font-heading text-[10px] font-bold tracking-wide sm:text-xs md:text-sm lg:text-base">
              {isLoading ? "…" : isPlaying ? "ON AIR" : "LIVE"}
              <span className="hidden md:inline"> RADIO</span>
            </span>
            <span className="hidden text-lg leading-none md:inline" aria-hidden>
              {isPlaying ? "❚❚" : "▶"}
            </span>
          </button>

          <button
            type="button"
            className="hidden h-10 w-10 -translate-x-1 items-center justify-center rounded-md border border-neutral-200 text-fh-ink transition hover:bg-fh-surface md:inline-flex"
            aria-label="Search"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path
                d="M20 20L16.5 16.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-neutral-100 bg-white px-3 py-3 md:px-4">
          <form
            className="mx-auto flex max-w-7xl gap-2"
            action="/search"
            method="get"
          >
            <input
              type="search"
              name="q"
              placeholder="පුවත්, gossip, videos සොයන්න..."
              className="w-full rounded-md border border-neutral-300 px-4 py-2.5 text-sm outline-none ring-fh-red focus:ring-2"
              autoFocus
            />
            <button
              type="submit"
              className="rounded-md bg-fh-red px-4 py-2.5 font-heading text-sm font-bold text-white"
            >
              සොයන්න
            </button>
          </form>
        </div>
      )}

      <nav className="bg-fh-red" aria-label="Main">
        <ul className="mx-auto flex w-full min-w-0 max-w-7xl items-center gap-0 overflow-x-auto px-1 md:gap-0.5 md:px-2">
          {MAIN_NAV_LINKS.map((link) => (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                className="inline-block whitespace-nowrap px-2.5 py-2 font-sans text-[12px] font-semibold tracking-wide text-white/95 transition hover:bg-black/15 md:px-3 md:py-2.5 md:text-[13px]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {menuOpen && (
        <nav
          className="border-t border-neutral-200 bg-white md:hidden"
          aria-label="Mobile menu"
        >
          <ul className="max-h-[70vh] overflow-y-auto px-2 py-2">
            {MAIN_NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-md px-3 py-3 font-sans text-sm font-semibold text-fh-ink hover:bg-fh-surface"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
