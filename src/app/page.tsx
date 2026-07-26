import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { AdvertiseWidget } from "@/components/home/AdvertiseWidget";
import { BrandPromo } from "@/components/home/BrandPromo";
import { CategoryIcons } from "@/components/home/CategoryIcons";
import { HeroSlider } from "@/components/home/HeroSlider";
import { LiveRadioPlayer } from "@/components/home/LiveRadioPlayer";
import { MidBannerAd } from "@/components/home/MidBannerAd";
import { MostRead } from "@/components/home/MostRead";
import { NewsGrid } from "@/components/home/NewsGrid";
import { VideosSection } from "@/components/home/VideosSection";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { videos } from "@/data/mock";
import { cmsToCard, listArticles } from "@/services/articles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [news, gossip] = await Promise.all([
    listArticles({ type: "news", status: "published", limit: 8 }),
    listArticles({ type: "gossip", status: "published", limit: 8 }),
  ]);

  const newsCards = news.map(cmsToCard);
  const gossipCards = gossip.map(cmsToCard);
  const mostReadCards = news.slice(0, 5).map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category,
    image: a.coverImage || "/logo/fmheart-cover.png",
    publishedAt: a.publishedAt || "",
    slug: a.slug,
  }));

  return (
    <div id="top" className="min-h-screen pb-16 md:pb-0">
      <TopBar />
      <Header />

      <main>
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[1fr_320px]">
          <HeroSlider />
          <div className="min-h-[320px] lg:min-h-full">
            <LiveRadioPlayer />
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-3 py-6 md:px-4 md:py-8">
          <AdSenseUnit label="Header Banner (728×90)" className="mb-8 min-h-[90px]" />

          <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
            <div className="space-y-10">
              <NewsGrid
                title="නවතම ප්‍රවෘත්ති"
                articles={newsCards}
                viewAllHref="/news"
              />

              <AdSenseUnit label="In-Feed Ad" className="min-h-[100px]" />

              <NewsGrid
                title="Gossip & Entertainment"
                articles={gossipCards}
                viewAllHref="/gossip"
              />

              <VideosSection videos={videos} />

              <CategoryIcons />
            </div>

            <aside className="space-y-5">
              <AdvertiseWidget />
              <MostRead articles={mostReadCards} />
              <AdSenseUnit label="Sidebar 300×250" className="min-h-[250px]" />
              <div className="border border-neutral-200 bg-fh-surface p-4">
                <p className="font-heading text-sm font-bold">
                  WhatsApp Channel
                </p>
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
        </div>

        <MidBannerAd />

        <div className="mx-auto max-w-7xl space-y-8 px-3 py-8 md:px-4">
          <BrandPromo />
          <AdSenseUnit label="Before Footer Banner" className="min-h-[90px]" />
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
