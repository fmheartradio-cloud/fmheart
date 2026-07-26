import { NextResponse } from "next/server";
import { isAdminSdkConfigured } from "@/lib/firebase/admin";
import { runNewsIngest } from "@/lib/newsbot/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminSdkConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "FIREBASE_SERVICE_ACCOUNT_JSON missing. Add it in Vercel Environment Variables.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await runNewsIngest({ maxPerSource: 8 });
    return NextResponse.json({
      at: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
