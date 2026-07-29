"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdvertiseWidget } from "@/components/home/AdvertiseWidget";
import { CategoryIcons } from "@/components/home/CategoryIcons";
import { HeroSlider } from "@/components/home/HeroSlider";
import { LiveRadioPlayer } from "@/components/home/LiveRadioPlayer";
import { MostRead } from "@/components/home/MostRead";
import { NewsGrid, type NewsCard } from "@/components/home/NewsGrid";
import { VideosSection } from "@/components/home/VideosSection";
import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { videos as mockVideos } from "@/data/mock";
import { adSlot } from "@/lib/ads";
import type { Article, VideoItem } from "@/types";

const POLL_MS = 45_000;

type HomeFeedPayload = {
  heroSlides: Article[];
  news: NewsCard[];
  gossip: NewsCard[];
  mostRead: Article[];
  videos: VideoItem[];
};

type LiveHomeFeedProps = HomeFeedPayload & {
  headerPromo: ReactNode;
};

function fingerprint(payload: HomeFeedPayload): string {
  return [
    payload.news.map((a) => a.id).join(","),
    payload.gossip.map((a) => a.id).join(","),
    payload.videos.map((v) => v.id).join(","),
  ].join("|");
}

export function LiveHomeFeed({
  heroSlides: initialHero,
  news: initialNews,
  gossip: initialGossip,
  mostRead: initialMostRead,
  videos: initialVideos,
  headerPromo,
}: LiveHomeFeedProps) {
  const [feed, setFeed] = useState<HomeFeedPayload>({
    heroSlides: initialHero,
    news: initialNews,
    gossip: initialGossip,
    mostRead: initialMostRead,
    videos: initialVideos,
  });
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/news/home", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as HomeFeedPayload;
        if (!data?.news || cancelled) return;

        setFeed((prev) => {
          const next: HomeFeedPayload = {
            heroSlides: data.heroSlides?.length ? data.heroSlides : prev.heroSlides,
            news: data.news?.length ? data.news : prev.news,
            gossip: data.gossip?.length ? data.gossip : prev.gossip,
            mostRead: data.mostRead?.length ? data.mostRead : prev.mostRead,
            videos: Array.isArray(data.videos)
              ? data.videos.length > 0
                ? data.videos
                : prev.videos
              : prev.videos,
          };
          if (fingerprint(next) !== fingerprint(prev)) {
            setFresh(true);
            window.setTimeout(() => setFresh(false), 4000);
          }
          return next;
        });
      } catch {
        // keep showing last good feed
      }
    };

    const schedule = () => {
      timer = setTimeout(async () => {
        await load();
        if (!cancelled) schedule();
      }, POLL_MS);
    };

    schedule();

    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <>
      {fresh ? (
        <div
          className="pointer-events-none fixed top-16 left-1/2 z-50 -translate-x-1/2 rounded-full bg-fh-red px-4 py-2 font-heading text-xs font-bold text-white shadow-lg md:top-20"
          role="status"
        >
          අලුත් පුවත් update වුණා
        </div>
      ) : null}

      <div className="grid w-full max-w-full grid-cols-1 gap-0 lg:grid-cols-[1fr_320px]">
        <HeroSlider slides={feed.heroSlides} />
        <div className="min-h-[320px] w-full min-w-0 max-w-full lg:min-h-full">
          <LiveRadioPlayer />
        </div>
      </div>

      <div className="w-full py-4 md:py-6">{headerPromo}</div>

      <div className="w-full max-w-full pb-8">
        <NewsGrid
          title="නවතම ප්‍රවෘත්ති"
          articles={feed.news}
          viewAllHref="/news"
          maxRows={2}
          mobileCount={10}
        />
      </div>

      <div className="grid w-full max-w-full grid-cols-1 gap-8 pb-8 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 max-w-full space-y-10 overflow-x-clip">
          <AdSenseUnit
            slot={adSlot("inArticle")}
            label="In-Feed Ad"
            className="min-h-[100px]"
          />

          <NewsGrid
            title="Gossip & Entertainment"
            articles={feed.gossip}
            viewAllHref="/gossip"
          />

          <VideosSection
            videos={feed.videos.length > 0 ? feed.videos : mockVideos}
          />

          <CategoryIcons />
        </div>

        <aside className="min-w-0 space-y-5">
          <AdvertiseWidget />
          <MostRead articles={feed.mostRead} />
          <AdSenseUnit
            slot={adSlot("sidebar")}
            label="Sidebar 300×250"
            className="min-h-[250px]"
          />
          <div className="border border-neutral-200 bg-fh-surface p-4">
            <p className="font-heading text-sm font-bold">WhatsApp Channel</p>
            <p className="mt-1 text-xs text-fh-muted">
              Breaking news සහ live updates ලබාගන්න
            </p>
            <a
              href="https://wa.me/94772175779"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-fh-whatsapp py-2.5 font-heading text-sm font-bold text-fh-black"
            >
              Join Channel
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
