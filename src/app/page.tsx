import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { BrandPromo } from "@/components/home/BrandPromo";
import { HeaderPromo } from "@/components/home/HeaderPromo";
import { LiveHomeFeed } from "@/components/home/LiveHomeFeed";
import { MidBannerAd } from "@/components/home/MidBannerAd";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { adSlot } from "@/lib/ads";
import { formatSriLankaDateTime } from "@/lib/datetime";
import { cmsToCard, listArticles } from "@/services/articles";
import { cmsToHeroSlide } from "@/services/hero";
import { getPublicVideos } from "@/services/videos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [news, gossip, videos] = await Promise.all([
    listArticles({ type: "news", status: "published", limit: 12 }),
    listArticles({ type: "gossip", status: "published", limit: 9 }),
    getPublicVideos(8),
  ]);

  const heroSlides = news.slice(0, 10).map(cmsToHeroSlide);
  const newsCards = news.map(cmsToCard);
  const gossipCards = gossip.map(cmsToCard);
  const mostReadCards = news.slice(0, 5).map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category,
    image: a.coverImage || "/logo/fmheart-cover.png",
    publishedAt: a.publishedAt
      ? formatSriLankaDateTime(a.publishedAt)
      : "",
    slug: a.slug,
  }));

  const headerPromo = adSlot("header") ? (
    <AdSenseUnit
      slot={adSlot("header")}
      label="Header Banner"
      className="w-full min-h-[90px]"
    />
  ) : (
    <HeaderPromo />
  );

  return (
    <div id="top" className="min-h-screen pb-16 md:pb-0">
      <TopBar />
      <Header />

      <main className="overflow-x-hidden">
        <div className="mx-auto w-full max-w-7xl px-3 md:px-4">
          <LiveHomeFeed
            heroSlides={heroSlides}
            news={newsCards}
            gossip={gossipCards}
            mostRead={mostReadCards}
            videos={videos}
            headerPromo={headerPromo}
          />
        </div>

        <MidBannerAd />

        <div className="mx-auto max-w-7xl space-y-8 px-3 py-8 md:px-4">
          <BrandPromo />
          <AdSenseUnit
            slot={adSlot("header")}
            label="Before Footer Banner"
            className="min-h-[90px]"
          />
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
