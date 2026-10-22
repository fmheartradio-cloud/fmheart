"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AdminNavIcon } from "@/components/admin/AdminIcons";
import { useAdminAuth } from "@/context/AdminAuthProvider";
import { ADMIN_NAV, isAdminNavActive } from "@/lib/admin-nav";

function SidebarBody({
  pathname,
  email,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  email?: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
        <Image
          src="/logo/fmheart-badge.png"
          alt=""
          width={40}
          height={46}
          className="h-10 w-auto object-contain"
        />
        <div className="min-w-0 leading-tight">
          <p className="font-heading text-lg font-extrabold tracking-wide">
            FMHeart
          </p>
          <p className="text-[10px] tracking-[0.22em] text-white/55 uppercase">
            Web Radio
          </p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {ADMIN_NAV.map((item) => {
          const active = isAdminNavActive(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-full px-3 py-2.5 text-[13px] font-semibold transition ${
                active
                  ? "bg-fh-red text-white shadow-[0_8px_18px_rgba(213,0,0,0.35)]"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <AdminNavIcon icon={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 px-4 py-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-h-10 items-center justify-center rounded-full border border-white/20 text-sm font-semibold text-white/90 hover:bg-white/10"
        >
          fmheart.lk
        </Link>
        <p className="mt-2 truncate text-[11px] text-white/40">{email}</p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-1 text-xs font-semibold text-fh-red hover:underline"
        >
          Logout
        </button>
      </div>
    </>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState(0);

  useEffect(() => {
    setMenuOpen(false);
    setBellOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/dashboard", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { drafts?: number }) => {
        if (!cancelled) setDrafts(Number(d.drafts) || 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const pageTitle = useMemo(
    () => ADMIN_NAV.find((n) => isAdminNavActive(pathname, n.href, n.exact))?.label || "Dashboard",
    [pathname],
  );

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/admin/articles?q=${encodeURIComponent(q)}` : "/admin/articles");
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] lg:flex">
      <aside
        className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col self-start overflow-hidden text-white lg:flex"
        style={{
          background:
            "linear-gradient(180deg, #5b0a16 0%, #2b050c 42%, #120308 100%)",
        }}
      >
        <SidebarBody
          pathname={pathname}
          email={user?.email}
          onLogout={() => void logout()}
        />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-[280px] max-w-[86vw] flex-col overflow-hidden text-white shadow-2xl"
            style={{
              background:
                "linear-gradient(180deg, #5b0a16 0%, #2b050c 42%, #120308 100%)",
            }}
          >
            <SidebarBody
              pathname={pathname}
              email={user?.email}
              onNavigate={() => setMenuOpen(false)}
              onLogout={() => void logout()}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur-md">
          <div className="flex items-center gap-2 px-3 py-2.5 md:px-5">
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-xl text-fh-ink lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>

            <Link href="/admin" className="flex items-center gap-2 lg:hidden">
              <Image
                src="/logo/fmheart-badge.png"
                alt="FM Heart"
                width={32}
                height={36}
                className="h-8 w-auto"
              />
            </Link>

            <form onSubmit={onSearch} className="relative hidden min-w-0 flex-1 md:block">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fh-muted">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3-3" />
                </svg>
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anything..."
                className="h-10 w-full max-w-xl rounded-full border border-black/8 bg-[#f4f6fb] pr-4 pl-9 text-sm outline-none focus:ring-2 focus:ring-fh-red/30"
              />
            </form>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setBellOpen((v) => !v)}
                  className="relative flex size-10 items-center justify-center rounded-full text-fh-ink hover:bg-black/5"
                  aria-label="Notifications"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z" />
                    <path d="M10 21h4" />
                  </svg>
                  {drafts > 0 ? (
                    <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fh-red px-1 text-[10px] font-bold text-white">
                      {drafts > 9 ? "9+" : drafts}
                    </span>
                  ) : null}
                </button>
                {bellOpen ? (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-black/5 bg-white p-3 text-sm shadow-xl">
                    <p className="font-heading text-sm font-bold">Notifications</p>
                    <p className="mt-2 text-fh-muted">
                      {drafts > 0
                        ? `${drafts} news drafts waiting to publish.`
                        : "No pending drafts."}
                    </p>
                    <Link
                      href="/admin/articles"
                      className="mt-3 inline-block font-semibold text-fh-red"
                    >
                      Open news →
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="hidden items-center gap-2 rounded-full py-1 pr-2 pl-1 sm:flex">
                <span className="flex size-8 items-center justify-center rounded-full bg-fh-red text-xs font-bold text-white">
                  {(user?.email || "A").slice(0, 1).toUpperCase()}
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-bold">Admin</span>
                  <span className="block max-w-[120px] truncate text-[11px] text-fh-muted">
                    FM Heart
                  </span>
                </span>
              </div>
            </div>
          </div>
          <p className="sr-only">{pageTitle}</p>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-4 md:px-6 md:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
