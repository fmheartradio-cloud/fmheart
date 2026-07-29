import { after, NextResponse } from "next/server";
import { isAdminSdkConfigured } from "@/lib/firebase/admin";
import { runNewsIngest } from "@/lib/newsbot/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

  const url = new URL(req.url);
  // cron-job.org (~30s timeout): /api/cron/newsbot?async=1
  // GitHub Actions / manual: default sync (waits for full ingest)
  const asyncMode = url.searchParams.get("async") === "1";

  if (asyncMode) {
    const startedAt = new Date().toISOString();
    after(async () => {
      try {
        await runNewsIngest({ maxPerSource: 8 });
      } catch (err) {
        console.error("[cron/newsbot] background ingest failed:", err);
      }
    });
    return NextResponse.json(
      {
        ok: true,
        accepted: true,
        at: startedAt,
        message: "News ingest started",
      },
      { status: 202 },
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
