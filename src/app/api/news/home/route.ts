import { NextResponse } from "next/server";
import { cmsToCard, listArticles } from "@/services/articles";
import { cmsToHeroSlide } from "@/services/hero";
import { formatSriLankaDateTime } from "@/lib/datetime";
import { getPublicVideos } from "@/services/videos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [news, gossip, videos] = await Promise.all([
      listArticles({ type: "news", status: "published", limit: 12 }),
      listArticles({ type: "gossip", status: "published", limit: 9 }),
      getPublicVideos(8),
    ]);

    return NextResponse.json({
      at: new Date().toISOString(),
      heroSlides: news.slice(0, 10).map(cmsToHeroSlide),
      news: news.map(cmsToCard),
      gossip: gossip.map(cmsToCard),
      mostRead: news.slice(0, 5).map((a) => ({
        id: a.id,
        title: a.title,
        category: a.category,
        image: a.coverImage || "/logo/fmheart-cover.png",
        publishedAt: a.publishedAt
          ? formatSriLankaDateTime(a.publishedAt)
          : "",
        slug: a.slug,
      })),
      videos,
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
