import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";
import {
  DJ_COOKIE,
  createDjSessionValue,
  djSessionCookieOptions,
  isDjCookieSecretConfigured,
  readDjSessionFromRequest,
} from "@/lib/dj-session";
import {
  djPasswordIsConfigured,
  djPasswordMatches,
  findDjByEmail,
} from "@/services/dj-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = readDjSessionFromRequest(req);
  const passwordConfigured = await djPasswordIsConfigured();
  return NextResponse.json({
    configured: isDbConfigured() && isDjCookieSecretConfigured() && passwordConfigured,
    db: isDbConfigured(),
    auth: passwordConfigured,
    email: session?.email || null,
  });
}

export async function POST(req: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      {
        error:
          "Turso configured නැහැ. TURSO_DATABASE_URL සහ TURSO_AUTH_TOKEN දාන්න.",
      },
      { status: 503 },
    );
  }
  if (!isDjCookieSecretConfigured()) {
    return NextResponse.json(
      { error: "AUTH_SECRET missing. DJ login sign කරන්න බැහැ." },
      { status: 503 },
    );
  }
  if (!(await djPasswordIsConfigured())) {
    return NextResponse.json(
      {
        error:
          "DJ login configured නැහැ. Admin → DJ Management එකේ portal password එකක් දාන්න, නැත්නම් DJ_PASSWORD env එකක් දාන්න.",
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
  const dj = await findDjByEmail(email);
  if (!dj) {
    return NextResponse.json(
      {
        error:
          "මේ email එක DJ list එකේ නැහැ. Admin DJ Management එකේ email එක දාන්න.",
      },
      { status: 403 },
    );
  }
  if (!(await djPasswordMatches(password))) {
    return NextResponse.json({ error: "Password වැරදියි." }, { status: 401 });
  }

  const res = NextResponse.json({
    ok: true,
    email,
    name: dj.title || email,
  });
  res.cookies.set(DJ_COOKIE, createDjSessionValue(email), djSessionCookieOptions());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DJ_COOKIE, "", { ...djSessionCookieOptions(), maxAge: 0 });
  return res;
}
