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
  { href: "/advertise", label: "ADVERTISE" },
  { href: "/contact", label: "CONTACT" },
] as const;

export function Header() {
  const { menuOpen, setMenuOpen } = useUi();
  const [searchOpen, setSearchOpen] = useState(false);
  const { isPlaying, isLoading, toggle, meta } = useRadio();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 md:gap-4 md:px-4 md:py-3">
        <div className="flex min-w-0 shrink-0 items-center">
          <Logo variant="tagline" />
        </div>

        {/* Desktop: fill empty middle with tagline + now playing */}
        <div className="hidden min-w-0 flex-1 items-center justify-center px-4 lg:flex">
          <div className="max-w-xl text-center">
            <p className="font-sigiri text-[28px] font-extrabold tracking-wide text-fh-ink md:text-[30px] lg:text-[34px]">
              {SITE.taglineSi}
            </p>
            <p className="mt-0.5 truncate text-xs text-fh-muted">
              <span className="font-semibold text-fh-red">
                {isPlaying ? "ON AIR" : "NOW PLAYING"}
              </span>
              <span className="mx-1.5 text-neutral-300">·</span>
              <span>
                {meta.song}
                {meta.artist ? ` — ${meta.artist}` : ""}
              </span>
            </p>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
          <Link
            href="/advertise"
            className="hidden rounded-md border border-neutral-200 px-3 py-2 font-heading text-xs font-bold tracking-wide text-fh-ink transition hover:border-fh-red hover:text-fh-red xl:inline-flex"
          >
            ADVERTISE
          </Link>

          <button
            type="button"
            onClick={() => void toggle()}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fh-red to-fh-red-dark px-3 py-2 text-white shadow-sm transition hover:brightness-110 md:px-4"
            aria-label={isPlaying ? "Pause live radio" : "Play live radio"}
          >
            <span
              className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-white animate-live"
              aria-hidden
            />
            <span className="font-heading text-sm font-bold tracking-wide md:text-base">
              {isLoading ? "LOADING…" : isPlaying ? "ON AIR" : "LIVE RADIO"}
            </span>
            <span className="hidden text-lg leading-none sm:inline" aria-hidden>
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

      <nav className="hidden bg-fh-red md:block" aria-label="Main">
        <ul className="mx-auto flex max-w-7xl items-center gap-0.5 overflow-x-auto px-2">
          {MAIN_NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-block whitespace-nowrap px-3 py-2.5 font-sans text-[13px] font-semibold tracking-wide text-white/95 transition hover:bg-black/15"
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
