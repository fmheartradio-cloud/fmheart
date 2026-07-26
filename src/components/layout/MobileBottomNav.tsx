"use client";

import Link from "next/link";
import { useUi } from "@/context/UiProvider";

const items = [
  {
    href: "/",
    label: "මුල් පිටුව",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/live",
    label: "Live",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <path d="M7 7a7 7 0 0 1 10 0M5 5a10 10 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/videos",
    label: "Videos",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M17 10l4-2v8l-4-2v-4Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/news",
    label: "පුවත්",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 5h11a2 2 0 0 1 2 2v12H7a2 2 0 0 1-2-2V5Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 9h7M8 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function MobileBottomNav() {
  const { toggleMenu } = useUi();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Mobile bottom"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex flex-col items-center gap-1 py-2.5 text-fh-ink transition hover:text-fh-red"
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={toggleMenu}
            className="flex w-full flex-col items-center gap-1 py-2.5 text-fh-ink transition hover:text-fh-red"
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
