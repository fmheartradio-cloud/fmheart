import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { listArticles } from "@/services/articles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Gossip",
  description: "FM Heart Gossip — celebrities, film, teledrama, TikTok සහ entertainment.",
};

export default async function GossipPage() {
  const articles = await listArticles({ type: "gossip", limit: 24 });

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <TopBar />
      <Header />
      <main className="mx-auto max-w-7xl px-3 py-8 md:px-4">
        <h1 className="font-heading text-3xl font-extrabold md:text-4xl">
          Gossip & Entertainment
        </h1>
        <p className="mt-2 text-sm text-fh-muted">
          Film · Tele Drama · TikTok · Celebrities · Lifestyle
        </p>

        <AdSenseUnit label="Gossip Header Banner" className="mt-6 min-h-[90px]" />

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <article key={article.id} className="group">
              <Link href={`/gossip/${encodeURIComponent(article.slug)}`}>
                <div className="relative aspect-[16/10] overflow-hidden bg-neutral-200">
                  <Image
                    src={article.coverImage}
                    alt=""
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <span className="absolute top-2 left-2 bg-fh-red px-2 py-0.5 font-heading text-[10px] font-bold text-white uppercase">
                    {article.category}
                  </span>
                </div>
                <h2 className="mt-3 font-heading text-lg font-bold leading-snug group-hover:text-fh-red">
                  {article.title}
                </h2>
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
