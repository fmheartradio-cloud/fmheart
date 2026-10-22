import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export const DJ_COOKIE = "fh_dj";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function secret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.DJ_PASSWORD?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    ""
  );
}

export function isDjCookieSecretConfigured(): boolean {
  return Boolean(secret());
}

function sign(payload: string): string {
  const mac = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function createDjSessionValue(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email, role: "dj", exp: Date.now() + MAX_AGE_MS }),
    "utf8",
  ).toString("base64url");
  return sign(payload);
}

export function verifyDjSessionValue(token: string): { email: string } | null {
  if (!token || !secret()) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const mac = token.slice(i + 1);
  const expected = createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  const macBuf = Buffer.from(mac);
  const expBuf = Buffer.from(expected);
  if (macBuf.length !== expBuf.length || !timingSafeEqual(macBuf, expBuf)) {
    return null;
  }
  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { email?: string; role?: string; exp?: number };
    if (!data.email || data.role !== "dj" || !data.exp || data.exp < Date.now()) {
      return null;
    }
    return { email: data.email };
  } catch {
    return null;
  }
}

export function readDjSessionFromRequest(req: Request): { email: string } | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)fh_dj=([^;]+)/);
  if (!match?.[1]) return null;
  try {
    return verifyDjSessionValue(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function djSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(MAX_AGE_MS / 1000),
  };
}

export async function requireDj(
  req: Request,
): Promise<{ email: string } | { error: NextResponse }> {
  const session = readDjSessionFromRequest(req);
  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized — DJ login required" },
        { status: 401 },
      ),
    };
  }
  return session;
}
