"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminAuth } from "@/context/AdminAuthProvider";
import { PRIMARY_ADMIN_EMAIL } from "@/lib/admin";

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const {
    configured,
    user,
    busy,
    message,
    denied,
    email,
    password,
    setEmail,
    setPassword,
    handleLogin,
  } = useAdminAuth();

  if (!configured) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="font-heading text-3xl font-extrabold">CMS Setup</h1>
        <p className="mt-3 text-fh-muted">
          Firebase ඉවත් කරලා <strong>Turso</strong> (free, credit card නැහැ)
          පාවිච්චි කරනවා. Admin:{" "}
          <code className="text-fh-red">{PRIMARY_ADMIN_EMAIL}</code>
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
          <li>
            <a
              href="https://turso.tech"
              target="_blank"
              rel="noreferrer"
              className="text-fh-red hover:underline"
            >
              turso.tech
            </a>{" "}
            → GitHub එකෙන් signup (card එකක් අහන්නේ නැහැ)
          </li>
          <li>Database එකක් create කරන්න — name: <code>fmheart</code></li>
          <li>
            URL + token copy කරලා Vercel + <code>.env.local</code> එකට දාන්න:
            <div className="mt-1 font-mono text-xs">
              TURSO_DATABASE_URL
              <br />
              TURSO_AUTH_TOKEN
              <br />
              ADMIN_PASSWORD
            </div>
          </li>
          <li>Redeploy කරලා මේ page එක refresh කරන්න</li>
        </ol>
        <Link href="/" className="mt-6 inline-block text-fh-red hover:underline">
          ← Homepage
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <h1 className="font-heading text-3xl font-extrabold">FM Heart CMS</h1>
        <p className="mt-2 text-sm text-fh-muted">
          Admin access:{" "}
          <span className="text-fh-ink">{PRIMARY_ADMIN_EMAIL}</span>
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-fh-red"
          />
          <input
            type="password"
            required
            placeholder="ADMIN_PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-fh-red"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-fh-red py-2.5 font-heading font-bold text-white disabled:opacity-60"
          >
            {busy ? "…" : "Login"}
          </button>
        </form>
        {(message || denied) && (
          <p className="mt-3 text-sm text-fh-red">
            {message ||
              `Access denied. ${PRIMARY_ADMIN_EMAIL} එකෙන් පමණක් CMS open කරන්න.`}
          </p>
        )}
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
