import { NextResponse } from "next/server";
import {
  adminPasswordMatches,
  createSessionValue,
  isAdminAuthConfigured,
  readSessionFromRequest,
  sessionCookieOptions,
  ADMIN_COOKIE,
} from "@/lib/admin-session";
import { isAdminEmail } from "@/lib/admin";
import { isDbConfigured } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = readSessionFromRequest(req);
  return NextResponse.json({
    configured: isAdminAuthConfigured() && isDbConfigured(),
    db: isDbConfigured(),
    auth: isAdminAuthConfigured(),
    email: session?.email || null,
  });
}

export async function POST(req: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "ADMIN_PASSWORD missing. Vercel env එකේ ADMIN_PASSWORD එකක් දාන්න.",
      },
      { status: 503 },
    );
  }
  if (!isDbConfigured()) {
    return NextResponse.json(
      {
        error:
          "Turso configured නැහැ. TURSO_DATABASE_URL සහ TURSO_AUTH_TOKEN දාන්න.",
      },
      { status: 503 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!isAdminEmail(email)) {
    return NextResponse.json(
      { error: "මේ email එකට CMS access නැහැ." },
      { status: 403 },
    );
  }
  if (!adminPasswordMatches(password)) {
    return NextResponse.json({ error: "Password වැරදියි." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, email });
  res.cookies.set(ADMIN_COOKIE, createSessionValue(email), sessionCookieOptions());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}
