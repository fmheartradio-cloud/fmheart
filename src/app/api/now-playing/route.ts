import { NextResponse } from "next/server";
import { fetchIcyNowPlaying } from "@/lib/radio/icy";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const track = await fetchIcyNowPlaying(SITE.streamUrl);

  if (!track) {
    return NextResponse.json(
      {
        ok: false,
        song: "FM Heart Live",
        artist: "On Air",
        rj: process.env.NEXT_PUBLIC_RADIO_RJ || "FM Heart",
        raw: null,
        updatedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      song: track.song,
      artist: track.artist,
      rj: process.env.NEXT_PUBLIC_RADIO_RJ || "FM Heart",
      raw: track.raw,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
