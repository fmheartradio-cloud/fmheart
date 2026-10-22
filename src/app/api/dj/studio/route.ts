import { NextResponse } from "next/server";
import { requireDj } from "@/lib/dj-session";
import { listCmsItems } from "@/services/lists";
import { getLiveStation, saveAnnouncement } from "@/services/station";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireDj(request);
  if ("error" in auth) return auth.error;
  try {
    const [{ live, state }, schedule] = await Promise.all([
      getLiveStation(),
      listCmsItems("schedule"),
    ]);
    return NextResponse.json({
      email: auth.email,
      live,
      state,
      schedule,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireDj(request);
  if ("error" in auth) return auth.error;

  let body: { action?: string; announcement?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (body.action === "announce") {
      const state = await saveAnnouncement(body.announcement || "", auth.email);
      return NextResponse.json({ ok: true, state });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
