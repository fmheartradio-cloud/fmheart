import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { fetchIcecastLive } from "@/lib/icecast";
import {
  getLiveStation,
  saveAnnouncement,
  setStationOnAir,
} from "@/services/station";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  try {
    const { live, state } = await getLiveStation();
    return NextResponse.json({ live, state });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  let body: { action?: string; announcement?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (body.action === "start" || body.action === "stop") {
      const onAir = body.action === "start";
      const live = await fetchIcecastLive(true);
      const state = await setStationOnAir(onAir, auth.email);
      return NextResponse.json({
        ok: true,
        live,
        state,
        notice: onAir
          ? live?.live
            ? "Stream is live on Icecast."
            : "CMS ON AIR. Icecast encoder එක Centova panel එකෙන් start කරන්න ඕන නම්."
          : "CMS marked OFF AIR. Icecast encoder එක website එකෙන් stop වෙන්නේ නැහැ.",
      });
    }

    if (body.action === "refresh") {
      const { live, state } = await getLiveStation();
      return NextResponse.json({ ok: true, live, state });
    }

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
