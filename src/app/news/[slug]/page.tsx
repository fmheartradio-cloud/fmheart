import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArticleViewTracker } from "@/components/analytics/ArticleViewTracker";
import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { ArticleJsonLd } from "@/components/seo/JsonLd";
import { adSlot } from "@/lib/ads";
import { SITE } from "@/lib/site";
import { getArticleBySlug, listArticles } from "@/services/articles";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Article" };
  return {
    title: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      images: [article.coverImage],
      publishedTime: article.publishedAt || undefined,
    },
    alternates: { canonical: `${SITE.url}/news/${article.slug}` },
  };
}

export async function generateStaticParams() {
  const articles = await listArticles({ type: "news", limit: 50 });
  return articles.map((a) => ({ slug: a.slug }));
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article || article.type !== "news") notFound();

  // Old long Sinhala URLs → short canonical slug
  try {
    const decoded = decodeURIComponent(slug).trim().replace(/[.\s]+$/g, "");
    if (decoded !== article.slug && !decoded.startsWith("news-")) {
      redirect(`/news/${article.slug}`);
    }
  } catch {
    // ignore
  }

  const related = (await listArticles({ type: "news", limit: 4 })).filter(
    (a) => a.slug !== article.slug,
  );

  const url = `${SITE.url}/news/${article.slug}`;

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
      <main className="mx-auto max-w-7xl px-3 py-8 md:px-4">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <article>
            <nav className="mb-4 text-xs text-fh-muted">
              <Link href="/" className="hover:text-fh-red">
                මුල් පිටුව
              </Link>
              {" / "}
              <Link href="/news" className="hover:text-fh-red">
                ප්‍රවෘත්ති
              </Link>
              {" / "}
              <span>{article.category}</span>
            </nav>

            <span className="inline-block bg-fh-red px-2 py-0.5 font-heading text-xs font-bold text-white uppercase">
              {article.category}
            </span>
            <h1 className="font-news-headline mt-3 text-3xl leading-snug md:text-4xl">
              {article.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-fh-muted">
              <span>{article.author}</span>
              <span>·</span>
              <span>{article.readingTimeMin} min read</span>
              {article.publishedAt && (
                <>
                  <span>·</span>
                  <time dateTime={article.publishedAt}>
                    {new Date(article.publishedAt).toLocaleDateString("si-LK")}
                  </time>
                </>
              )}
            </div>

            <div className="relative mt-6 aspect-[16/9] overflow-hidden bg-neutral-200">
              <Image
                src={article.coverImage || "/logo/fmheart-cover.png"}
                alt=""
                fill
                priority
                unoptimized
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 70vw"
              />
            </div>

            <AdSenseUnit
              slot={adSlot("header")}
              label="After Featured Image"
              className="mt-6 min-h-[90px]"
            />

            <div className="prose-article mt-6 space-y-4 text-justify font-article text-lg leading-8 text-fh-ink whitespace-pre-line">
              {article.body}
            </div>

            <AdSenseUnit
              slot={adSlot("inArticle")}
              label="In-Article Ad"
              className="my-8 min-h-[90px]"
            />

            <div className="flex flex-wrap gap-2 border-t border-neutral-200 pt-6">
              <span className="text-sm font-semibold">Share:</span>
              <a
                className="text-sm text-fh-red hover:underline"
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Facebook
              </a>
              <a
                className="text-sm text-fh-red hover:underline"
                href={`https://wa.me/?text=${encodeURIComponent(article.title + " " + url)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            </div>

            {related.length > 0 && (
              <section className="mt-10">
                <h2 className="border-b-2 border-fh-red pb-2 font-heading text-xl font-extrabold">
                  අදාළ පුවත්
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {related.slice(0, 4).map((item) => (
                    <Link
                      key={item.id}
                      href={`/news/${encodeURIComponent(item.slug)}`}
                      className="flex gap-3 hover:opacity-90"
                    >
                      <div className="relative h-16 w-20 shrink-0 overflow-hidden bg-neutral-200">
                        <Image
                          src={item.coverImage || "/logo/fmheart-cover.png"}
                          alt=""
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                      <h3 className="font-news-headline text-sm leading-snug">
                        {item.title}
                      </h3>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </article>

          <aside className="space-y-5">
            <AdSenseUnit
              slot={adSlot("sidebar")}
              label="Sidebar 300×250"
              className="min-h-[250px]"
            />
          </aside>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
