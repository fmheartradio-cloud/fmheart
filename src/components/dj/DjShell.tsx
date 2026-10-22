"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useDjAuth } from "@/context/DjAuthProvider";

const NAV = [
  { href: "/dj", label: "Studio", exact: true },
  { href: "/live", label: "Listen live" },
];

export function DjShell({ children }: { children: ReactNode }) {
  const { user, logout } = useDjAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Image
            src="/logo/fmheart-badge.png"
            alt="FM Heart"
            width={32}
            height={36}
            className="h-8 w-auto"
          />
          <div className="min-w-0">
            <p className="font-heading text-base font-extrabold">DJ Studio</p>
            <p className="truncate text-[11px] text-fh-muted">{user?.email}</p>
          </div>
          <nav className="ml-auto flex items-center gap-2">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-2 text-sm font-semibold ${
                    active ? "bg-fh-red text-white" : "text-fh-ink hover:bg-black/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full px-3 py-2 text-sm font-semibold text-fh-red"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
