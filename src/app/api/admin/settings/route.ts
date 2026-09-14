import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import {
  getCmsBreakingHeadlines,
  saveBreakingHeadlines,
} from "@/services/breaking";
import { getCmsHeroSlides, saveHeroSlides } from "@/services/hero";
import { getCmsVideos, saveVideos, type VideoInput } from "@/services/videos";
import type { HeroSlideInput } from "@/services/hero";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const key = new URL(request.url).searchParams.get("key");
  try {
    if (key === "videos") {
      return NextResponse.json({ items: await getCmsVideos() });
    }
    if (key === "hero") {
      return NextResponse.json({ slides: await getCmsHeroSlides() });
    }
    if (key === "breaking") {
      return NextResponse.json({ headlines: await getCmsBreakingHeadlines() });
    }
    return NextResponse.json({ error: "Unknown settings key" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  let body: {
    key?: string;
    items?: VideoInput[];
    slides?: HeroSlideInput[];
    headlines?: string[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (body.key === "videos") {
      const items = await saveVideos(body.items || []);
      return NextResponse.json({ items });
    }
    if (body.key === "hero") {
      const slides = await saveHeroSlides(body.slides || []);
      return NextResponse.json({ slides });
    }
    if (body.key === "breaking") {
      const headlines = await saveBreakingHeadlines(body.headlines || []);
      return NextResponse.json({ headlines });
    }
    return NextResponse.json({ error: "Unknown settings key" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
