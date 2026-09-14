import { createHmac, timingSafeEqual } from "crypto";
import { isAdminEmail } from "@/lib/admin";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE = "fh_admin";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function secret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    ""
  );
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD?.trim() && secret());
}

export function adminPasswordMatches(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD?.trim() || "";
  if (!expected || !password) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sign(payload: string): string {
  const mac = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function createSessionValue(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + MAX_AGE_MS }),
    "utf8",
  ).toString("base64url");
  return sign(payload);
}

export function verifySessionValue(token: string): { email: string } | null {
  if (!token || !secret()) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const mac = token.slice(i + 1);
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const macBuf = Buffer.from(mac);
  const expBuf = Buffer.from(expected);
  if (macBuf.length !== expBuf.length || !timingSafeEqual(macBuf, expBuf)) {
    return null;
  }
  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { email?: string; exp?: number };
    if (!data.email || !data.exp || data.exp < Date.now()) return null;
    if (!isAdminEmail(data.email)) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

export function readSessionFromRequest(req: Request): { email: string } | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)fh_admin=([^;]+)/);
  if (!match?.[1]) return null;
  try {
    return verifySessionValue(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(MAX_AGE_MS / 1000),
  };
}

export async function requireAdmin(
  req: Request,
): Promise<{ email: string } | { error: NextResponse }> {
  const session = readSessionFromRequest(req);
  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized — admin login required" },
        { status: 401 },
      ),
    };
  }
  return session;
}
