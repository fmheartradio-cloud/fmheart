import type { Metadata } from "next";
import Link from "next/link";
import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { CoverImage } from "@/components/ui/CoverImage";
import { adSlot } from "@/lib/ads";
import { listArticles } from "@/services/articles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "උණුසුම් පුවත්",
  description: "FM Heart — නවතම සිංහල උණුසුම් පුවත්, breaking news සහ analysis.",
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  "ක්‍රීඩා": ["ක්‍රීඩා"],
  "ව්‍යාපාර": ["ව්‍යාපාර", "ව්‍යාපාරික"],
  "ලෝක පුවත්": ["ලෝක පුවත්", "විදෙස්", "විදේශීය", "ජාත්‍යන්තර"],
};

function normalizeCategory(input: string | undefined): string {
  const raw = decodeURIComponent((input || "").trim());
  if (!raw) return "";
  for (const [canonical, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some((v) => v === raw)) return canonical;
  }
  return raw;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) || {};
  const categoryValue = Array.isArray(params.category)
    ? params.category[0]
    : params.category;
  const selectedCategory = normalizeCategory(categoryValue);

  const allNews = await listArticles({ type: "news", limit: 80 });
  const articles = selectedCategory
    ? allNews.filter((a) => normalizeCategory(a.category) === selectedCategory)
    : allNews;

  const pageTitle = selectedCategory ? `${selectedCategory} පුවත්` : "උණුසුම් පුවත්";

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <TopBar />
      <Header />
      <main className="mx-auto max-w-7xl px-3 py-8 md:px-4">
        <h1 className="font-heading text-3xl font-extrabold md:text-4xl">{pageTitle}</h1>
        <p className="mt-2 text-sm text-fh-muted">Latest news from FM Heart newsroom</p>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link
            href="/news"
            className={`rounded-full px-3 py-1.5 font-semibold ${
              !selectedCategory ? "bg-fh-red text-white" : "bg-neutral-100 text-fh-ink"
            }`}
          >
            උණුසුම් පුවත්
          </Link>
          <Link
            href="/news?category=%E0%B6%9A%E0%B7%8A%E2%80%8D%E0%B6%BB%E0%B7%93%E0%B6%A9%E0%B7%8F"
            className={`rounded-full px-3 py-1.5 font-semibold ${
              selectedCategory === "ක්‍රීඩා" ? "bg-fh-red text-white" : "bg-neutral-100 text-fh-ink"
            }`}
          >
            ක්‍රීඩා
          </Link>
          <Link
            href="/news?category=%E0%B7%80%E0%B7%8A%E2%80%8D%E0%B6%BA%E0%B7%8F%E0%B6%B4%E0%B7%8F%E0%B6%BB"
            className={`rounded-full px-3 py-1.5 font-semibold ${
              selectedCategory === "ව්‍යාපාර" ? "bg-fh-red text-white" : "bg-neutral-100 text-fh-ink"
            }`}
          >
            ව්‍යාපාරික
          </Link>
          <Link
            href="/news?category=%E0%B7%80%E0%B7%92%E0%B6%AF%E0%B7%99%E0%B7%83%E0%B7%8A"
            className={`rounded-full px-3 py-1.5 font-semibold ${
              selectedCategory === "ලෝක පුවත්" ? "bg-fh-red text-white" : "bg-neutral-100 text-fh-ink"
            }`}
          >
            විදෙස්
          </Link>
        </div>

        <AdSenseUnit
          slot={adSlot("header")}
          label="News Header Banner"
          className="mt-6 min-h-[90px]"
        />

        <div className="mt-8 grid w-full grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {articles.map((article) => (
            <article key={article.id} className="group min-w-0">
              <Link href={`/news/${encodeURIComponent(article.slug)}`}>
                <div className="relative aspect-[16/10] overflow-hidden bg-neutral-200">
                  <CoverImage
                    src={article.coverImage || "/logo/fmheart-cover.png"}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <h2 className="font-news-headline mt-3 text-lg leading-snug group-hover:text-fh-red">
                  {article.title}
                </h2>
                <p className="mt-1 line-clamp-2 font-article text-sm text-fh-muted">
                  {article.excerpt}
                </p>
              </Link>
            </article>
          ))}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
