"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAdminAuth } from "@/context/AdminAuthProvider";

const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/breaking", label: "Breaking" },
  { href: "/admin/hero", label: "Hero" },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAdminAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f0f0f0] lg:flex">
      <aside className="hidden w-56 shrink-0 flex-col bg-fh-black text-white lg:flex">
        <div className="border-b border-white/10 px-4 py-5">
          <p className="font-heading text-lg font-extrabold tracking-wide">
            FM Heart
          </p>
          <p className="mt-0.5 text-[11px] tracking-[0.15em] text-neutral-400 uppercase">
            Admin Dashboard
          </p>
        </div>
        <div className="flex-1 px-2 py-4">
          <nav className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2.5 font-heading text-sm font-bold tracking-wide transition ${
                    active
                      ? "bg-fh-red text-white"
                      : "text-neutral-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-xs text-neutral-400">
          <p className="truncate">{user?.email}</p>
          <div className="mt-3 flex gap-3">
            <Link href="/" className="hover:text-white">
              View site
            </Link>
            <button
              type="button"
              className="text-fh-red hover:brightness-110"
              onClick={() => void logout()}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-neutral-200 bg-white lg:hidden">
          <div className="flex items-center justify-between gap-3 px-3 py-3">
            <div>
              <p className="font-heading text-base font-extrabold">FM Heart</p>
              <p className="truncate text-[11px] text-fh-muted">{user?.email}</p>
            </div>
            <div className="flex gap-3 text-sm">
              <Link href="/" className="hover:text-fh-red">
                Site
              </Link>
              <button
                type="button"
                className="text-fh-red"
                onClick={() => void logout()}
              >
                Logout
              </button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto border-t border-neutral-100 px-2 py-2">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 px-3 py-1.5 font-heading text-xs font-bold ${
                    active
                      ? "bg-fh-red text-white"
                      : "bg-fh-surface text-fh-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </header>

        <main className="flex-1 px-3 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
