import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleViewTracker } from "@/components/analytics/ArticleViewTracker";
import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { ArticleJsonLd } from "@/components/seo/JsonLd";
import { MixedScriptText } from "@/components/ui/MixedScriptText";
import { adSlot } from "@/lib/ads";
import { SITE } from "@/lib/site";
import { getArticleBySlug, listArticles } from "@/services/articles";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Gossip" };
  return {
    title: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      images: [article.coverImage],
    },
  };
}

export async function generateStaticParams() {
  const articles = await listArticles({ type: "gossip", limit: 50 });
  return articles.map((a) => ({ slug: a.slug }));
}

export default async function GossipArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article || article.type !== "gossip") notFound();

  const url = `${SITE.url}/gossip/${article.slug}`;

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <ArticleJsonLd
        title={article.title}
        description={article.excerpt}
        image={article.coverImage}
        publishedAt={article.publishedAt || article.createdAt}
        author={article.author}
        url={url}
      />
      <TopBar />
      <Header />
      <ArticleViewTracker articleId={article.id} />
      <main className="mx-auto max-w-3xl px-3 py-8 md:px-4">
        <nav className="mb-4 text-xs text-fh-muted">
          <Link href="/" className="hover:text-fh-red">
            මුල් පිටුව
          </Link>
          {" / "}
          <Link href="/gossip" className="hover:text-fh-red">
            Gossip
          </Link>
        </nav>
        <h1 className="font-news-headline mt-3 text-3xl leading-snug md:text-4xl">
          <MixedScriptText text={article.title} />
        </h1>
        <div className="relative mt-6 aspect-[16/9] overflow-hidden bg-neutral-200">
          <Image
            src={article.coverImage}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="800px"
          />
        </div>
        <AdSenseUnit
          slot={adSlot("inArticle")}
          label="Gossip In-Article"
          className="mt-6 min-h-[90px]"
        />
        <div className="prose-article mt-6 text-justify font-article text-lg leading-8 whitespace-pre-line">
          {article.body}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
