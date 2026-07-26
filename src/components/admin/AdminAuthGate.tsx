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
    handleGoogleLogin,
  } = useAdminAuth();

  if (!configured) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="font-heading text-3xl font-extrabold">CMS Setup</h1>
        <p className="mt-3 text-fh-muted">
          Firebase config තවම `.env.local` එකේ නැහැ. Admin:{" "}
          <code className="text-fh-red">{PRIMARY_ADMIN_EMAIL}</code>
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
          <li>
            Firebase project එක <strong>{PRIMARY_ADMIN_EMAIL}</strong> එකෙන්
            create / own කරන්න
          </li>
          <li>Authentication → Google + Email/Password enable කරන්න</li>
          <li>Web app config → `.env.local`</li>
          <li>
            <code>npx firebase deploy --only firestore:rules,storage</code>
          </li>
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

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleGoogleLogin()}
          className="mt-6 flex w-full items-center justify-center gap-2 border border-neutral-300 bg-white py-3 font-heading text-sm font-bold transition hover:bg-fh-surface disabled:opacity-60"
        >
          <span aria-hidden>G</span>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-fh-muted">
          <span className="h-px flex-1 bg-neutral-200" />
          or email / password
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
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
            placeholder="Password"
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
