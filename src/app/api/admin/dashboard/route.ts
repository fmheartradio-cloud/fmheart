import { NextResponse } from "next/server";
import { HOME_AD_SLOTS } from "@/lib/ad-placements";
import { requireAdmin } from "@/lib/admin-session";
import { formatSriLankaShort, sriLankaNowParts } from "@/lib/datetime";
import { getCmsAds } from "@/services/ads";
import { listArticlesDb } from "@/services/articles";
import { getLiveStation } from "@/services/station";
import { isLiveBanner } from "@/types/ads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const [station, articles, ads] = await Promise.all([
      getLiveStation(),
      listArticlesDb({ status: "all", limit: 80 }),
      getCmsAds(),
    ]);

    const { live, state } = station;
    const clock = sriLankaNowParts();
    const published = articles.filter((a) => a.status === "published");
    const drafts = articles.filter((a) => a.status === "draft");
    const views = articles.reduce((sum, a) => sum + (a.views || 0), 0);
    const prev =
      state.listenerPoints.length >= 2
        ? state.listenerPoints[state.listenerPoints.length - 2]!.n
        : state.daily.lastListeners;
    const listeners = live?.listeners ?? 0;
    const liveDelta =
      prev > 0 ? Math.round(((listeners - prev) / prev) * 100) : null;

    const streamHours = live?.streamStart
      ? Math.max(
          0,
          Math.round(
            (Date.now() - Date.parse(live.streamStart)) / 36e5,
          ),
        )
      : 0;

    const recentNews = [...articles]
      .sort((a, b) => {
        const ta = Date.parse(a.updatedAt || a.publishedAt || a.createdAt || "") || 0;
        const tb = Date.parse(b.updatedAt || b.publishedAt || b.createdAt || "") || 0;
        return tb - ta;
      })
      .slice(0, 4)
      .map((a) => ({
        id: a.id,
        title: a.title,
        image: a.coverImage,
        date: formatSriLankaShort(a.publishedAt || a.updatedAt || a.createdAt),
        views: a.views || 0,
        status: a.status,
        slug: a.slug,
        type: a.type,
      }));

    const adSlots = HOME_AD_SLOTS.map((slot) => {
      const banner = ads.banners[slot.id];
      return {
        id: slot.id,
        name: slot.name,
        sizes: slot.sizes.join(" / "),
        enabled: Boolean(banner?.enabled && banner.imageUrl),
        imageUrl: banner?.imageUrl || "",
        live: isLiveBanner(banner),
      };
    });

    const topTracks = state.trackHistory.slice(0, 5).map((t, i) => ({
      rank: i + 1,
      song: t.song,
      artist: t.artist,
      plays: t.plays,
    }));

    return NextResponse.json({
      clock,
      radio: {
        onAir: Boolean(live?.live && state.onAir),
        live: Boolean(live?.live),
        cmsOnAir: state.onAir,
        listeners,
        peak: Math.max(live?.peak || 0, state.daily.peak),
        bitrate: live?.bitrate || 0,
        song: live?.track.song || "FM Heart Live",
        artist: live?.track.artist || "On Air",
        streamStart: live?.streamStart,
        titleStartedAt: state.titleStartedAt,
        announcement: state.announcement,
      },
      kpis: {
        liveListeners: listeners,
        liveDelta,
        totalToday: Math.max(state.daily.peak, listeners, live?.peak || 0),
        streamHours,
        visitors: views,
      },
      listenerSeries: state.listenerPoints,
      topTracks,
      news: recentNews,
      ads: adSlots,
      drafts: drafts.length,
      published: published.length,
      notifications: [
        drafts.length
          ? {
              id: "drafts",
              text: `${drafts.length} news drafts waiting`,
              href: "/admin/articles",
            }
          : null,
        live?.live
          ? {
              id: "live",
              text: `ON AIR · ${listeners} listening`,
              href: "/admin/live",
            }
          : {
              id: "offline",
              text: "Stream not detected",
              href: "/admin/live",
            },
        state.announcement
          ? {
              id: "ann",
              text: state.announcement.slice(0, 80),
              href: "/admin/now-playing",
            }
          : null,
      ].filter(Boolean),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
