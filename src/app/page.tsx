import { HomeAdSlot } from "@/components/ads/HomeAdSlot";
import { BrandPromo } from "@/components/home/BrandPromo";
import { HeaderPromo } from "@/components/home/HeaderPromo";
import { LiveHomeFeed } from "@/components/home/LiveHomeFeed";
import { MidBannerAd } from "@/components/home/MidBannerAd";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { formatSriLankaDateTime } from "@/lib/datetime";
import { pickHomeCategoryNews } from "@/lib/home-category-news";
import { getPublicAds } from "@/services/ads";
import { cmsToCard, listArticles } from "@/services/articles";
import { cmsToHeroSlide } from "@/services/hero";
import { getPublicVideos } from "@/services/videos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [allNews, gossip, videos, ads] = await Promise.all([
    listArticles({ type: "news", status: "published", limit: 80 }),
    listArticles({ type: "gossip", status: "published", limit: 9 }),
    getPublicVideos(8),
    getPublicAds(),
  ]);

  const news = allNews.slice(0, 12);
  const categories = pickHomeCategoryNews(allNews, 6);
  const heroSlides = news.slice(0, 10).map(cmsToHeroSlide);
  const newsCards = news.map(cmsToCard);
  const gossipCards = gossip.map(cmsToCard);
  const foreign = categories.foreign.map(cmsToCard);
  const business = categories.business.map(cmsToCard);
  const sports = categories.sports.map(cmsToCard);
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

  const headerPromo = (
    <HomeAdSlot
      banner={ads.banners.header}
      adsenseKind="header"
      label="Header Banner"
      className="w-full min-h-[90px]"
      fallback={<HeaderPromo />}
    />
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
            foreign={foreign}
            business={business}
            sports={sports}
            headerPromo={headerPromo}
            playerBanner={ads.banners.player}
            inFeedBanner={ads.banners.inFeed}
            sidebarBanner={ads.banners.sidebar}
          />
        </div>

        <MidBannerAd banner={ads.banners.partnerStrip} />

        <div className="mx-auto max-w-7xl space-y-8 px-3 py-8 md:px-4">
          <BrandPromo />
          <HomeAdSlot
            banner={ads.banners.footer}
            adsenseKind="header"
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
