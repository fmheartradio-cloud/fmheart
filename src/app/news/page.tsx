import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { adSlot } from "@/lib/ads";
import { listArticles } from "@/services/articles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "ප්‍රවෘත්ති",
  description: "FM Heart — නවතම සිංහල ප්‍රවෘත්ති, breaking news සහ analysis.",
};

export default async function NewsPage() {
  const articles = await listArticles({ type: "news", limit: 24 });

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <TopBar />
      <Header />
      <main className="mx-auto max-w-7xl px-3 py-8 md:px-4">
        <h1 className="font-heading text-3xl font-extrabold md:text-4xl">
          ප්‍රවෘත්ති
        </h1>
        <p className="mt-2 text-sm text-fh-muted">
          Latest news from FM Heart newsroom
        </p>

        <AdSenseUnit
          slot={adSlot("header")}
          label="News Header Banner"
          className="mt-6 min-h-[90px]"
        />

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <article key={article.id} className="group">
              <Link href={`/news/${encodeURIComponent(article.slug)}`}>
                <div className="relative aspect-[16/10] overflow-hidden bg-neutral-200">
                  <Image
                    src={article.coverImage || "/logo/fmheart-cover.png"}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <span className="absolute top-2 left-2 bg-fh-red px-2 py-0.5 font-heading text-[10px] font-bold text-white uppercase">
                    {article.category}
                  </span>
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
