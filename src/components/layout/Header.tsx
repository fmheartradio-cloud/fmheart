"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { useRadio } from "@/context/RadioProvider";
import { navLinks } from "@/data/mock";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isPlaying, isLoading, toggle } = useRadio();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 md:px-4 md:py-3">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 text-fh-ink md:hidden"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="text-xl leading-none">{menuOpen ? "✕" : "☰"}</span>
        </button>

        <div className="hidden md:block">
          <Logo />
        </div>
        <div className="md:hidden">
          <Logo variant="icon" />
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => void toggle()}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fh-red to-fh-red-dark px-3 py-2 text-white shadow-sm transition hover:brightness-110 md:px-4"
            aria-label={isPlaying ? "Pause live radio" : "Play live radio"}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full rounded-full bg-white opacity-75 ${isPlaying ? "animate-live" : ""}`}
              />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            <span className="font-heading text-sm font-bold tracking-wide md:text-base">
              {isLoading ? "LOADING…" : isPlaying ? "ON AIR" : "LIVE RADIO"}
            </span>
            <span className="hidden text-lg leading-none sm:inline" aria-hidden>
              {isPlaying ? "❚❚" : "▶"}
            </span>
          </button>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 text-fh-ink transition hover:bg-fh-surface"
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
          {navLinks.map((link) => (
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
            {navLinks.map((link) => (
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
