"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminAuth } from "@/context/AdminAuthProvider";
import { PRIMARY_ADMIN_EMAIL } from "@/lib/admin";

const FIELD =
  "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-fh-red";

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
  const [showPassword, setShowPassword] = useState(false);

  if (!configured) {
    return (
      <div className="min-h-screen bg-fh-black px-4 py-12 text-white">
        <div className="mx-auto max-w-lg">
          <p className="font-heading text-2xl font-extrabold tracking-wide">
            FM <span className="text-fh-red">HEART</span> CMS
          </p>
          <p className="mt-3 text-sm text-neutral-300">
            Turso setup එකක් ඕන. Admin:{" "}
            <code className="text-fh-red">{PRIMARY_ADMIN_EMAIL}</code>
          </p>
          <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-neutral-200">
            <li>
              <a
                href="https://turso.tech"
                target="_blank"
                rel="noreferrer"
                className="text-fh-red hover:underline"
              >
                turso.tech
              </a>{" "}
              → GitHub එකෙන් signup
            </li>
            <li>
              Database: <code>fmheart</code>
            </li>
            <li>
              Vercel + <code>.env.local</code>: TURSO_DATABASE_URL,
              TURSO_AUTH_TOKEN, ADMIN_PASSWORD
            </li>
            <li>Redeploy කරලා refresh කරන්න</li>
          </ol>
          <Link href="/" className="mt-8 inline-block text-fh-red hover:underline">
            ← Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-fh-black px-4 py-8 text-white">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-8 flex flex-col items-center text-center">
            <Image
              src="/logo/fmheart-badge.png"
              alt="FM Heart"
              width={88}
              height={102}
              priority
              className="h-20 w-auto object-contain"
            />
            <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-wide">
              FM <span className="text-fh-red">HEART</span>
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              CMS login · පුවත් සහ ad banners update කරන්න
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-4 rounded-2xl border border-white/10 bg-white p-5 text-fh-ink sm:p-6"
          >
            <label className="block text-sm font-semibold">
              Email
              <input
                type="email"
                required
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="email"
                placeholder={PRIMARY_ADMIN_EMAIL}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1 ${FIELD}`}
              />
            </label>

            <label className="block text-sm font-semibold">
              Password
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="ADMIN_PASSWORD"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${FIELD} pr-20`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 px-2 py-1 text-sm font-semibold text-fh-muted"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="min-h-12 w-full rounded-full bg-fh-red font-heading text-base font-bold tracking-wide text-white disabled:opacity-60"
            >
              {busy ? "Checking…" : "පිවිසෙන්න · Login"}
            </button>

            {(message || denied) && (
              <p className="text-sm text-fh-red">
                {message ||
                  `Access denied. ${PRIMARY_ADMIN_EMAIL} එකෙන් පමණක් CMS open කරන්න.`}
              </p>
            )}
          </form>

          <Link
            href="/"
            className="mt-6 text-center text-sm text-neutral-400 hover:text-white"
          >
            ← Back to fmheart.lk
          </Link>
        </div>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
