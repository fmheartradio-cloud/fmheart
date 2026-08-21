import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArticleViewTracker } from "@/components/analytics/ArticleViewTracker";
import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { MostRead } from "@/components/home/MostRead";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { ArticleJsonLd } from "@/components/seo/JsonLd";
import { CoverImage } from "@/components/ui/CoverImage";
import { MixedScriptText } from "@/components/ui/MixedScriptText";
import { ShareButtons } from "@/components/ui/ShareButtons";
import { adSlot } from "@/lib/ads";
import { formatSriLankaDateTime } from "@/lib/datetime";
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

  const latest = (await listArticles({ type: "news", limit: 12 })).filter(
    (a) => a.slug !== article.slug,
  );
  const mostReadCards = latest.slice(0, 5).map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category,
    image: a.coverImage || "/logo/fmheart-cover.png",
    publishedAt: a.publishedAt
      ? formatSriLankaDateTime(a.publishedAt)
      : "",
    slug: a.slug,
  }));
  const sidebarRelated = latest.slice(5, 12);

  const url = `${SITE.url}/news/${article.slug}`;
  const publishedIso = article.publishedAt || article.createdAt;
  const datestamp = publishedIso ? formatSriLankaDateTime(publishedIso) : "";
  const coverSrc = article.coverImage || "/logo/fmheart-cover.png";

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <ArticleJsonLd
        title={article.title}
        description={article.excerpt}
        image={article.coverImage}
        publishedAt={publishedIso}
        author={article.author}
        url={url}
      />
      <TopBar />
      <Header />
      <ArticleViewTracker articleId={article.id} />
      <main className="mx-auto max-w-7xl px-3 py-6 md:px-4 md:py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <article className="min-w-0">
            <nav className="mb-3 text-xs text-fh-muted">
              <Link href="/" className="hover:text-fh-red">
                මුල් පිටුව
              </Link>
              {" / "}
              <Link href="/news" className="hover:text-fh-red">
                ප්‍රවෘත්ති
              </Link>
            </nav>

            {/* Cover first — natural width (no forced 16:9 crop) */}
            <div className="relative w-full overflow-hidden bg-neutral-100">
              <CoverImage
                src={coverSrc}
                alt=""
                width={1200}
                height={675}
                priority
                sizes="(max-width: 1024px) 100vw, 70vw"
                className="h-auto w-full object-contain"
              />
            </div>

            <h1 className="font-news-headline mt-4 text-2xl leading-snug text-fh-ink md:mt-5 md:text-4xl">
              <MixedScriptText text={article.title} />
            </h1>

            {datestamp ? (
              <time
                dateTime={publishedIso}
                className="mt-2 block font-feature text-sm text-fh-muted md:text-[15px]"
              >
                {datestamp}
              </time>
            ) : null}
            <p className="mt-1 text-xs text-fh-muted">
              {article.author}
              {article.readingTimeMin
                ? ` · ${article.readingTimeMin} min read`
                : ""}
            </p>

            <AdSenseUnit
              slot={adSlot("header")}
              label="After Featured Image"
              className="mt-5 min-h-[90px]"
            />

            <div className="prose-article mt-6 space-y-4 text-justify font-article text-lg leading-8 text-fh-ink whitespace-pre-line">
              {article.body}
            </div>

            <AdSenseUnit
              slot={adSlot("inArticle")}
              label="In-Article Ad"
              className="my-8 min-h-[90px]"
            />

            <ShareButtons url={url} title={article.title} />
          </article>

          <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start">
            {mostReadCards.length > 0 ? (
              <MostRead articles={mostReadCards} />
            ) : null}

            {sidebarRelated.length > 0 ? (
              <section className="border border-neutral-200 bg-white">
                <div className="bg-fh-red px-4 py-2.5">
                  <h2 className="font-heading text-sm font-bold tracking-wide text-white">
                    අදාළ පුවත්
                  </h2>
                </div>
                <div className="max-h-[420px] overflow-y-auto">
                  <ul className="divide-y divide-neutral-100">
                    {sidebarRelated.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`/news/${encodeURIComponent(item.slug)}`}
                          className="flex gap-3 p-3 transition hover:bg-fh-surface"
                        >
                          <div className="relative h-14 w-[4.5rem] shrink-0 overflow-hidden bg-neutral-200">
                            <CoverImage
                              src={item.coverImage || "/logo/fmheart-cover.png"}
                              fill
                              className="object-cover"
                              sizes="72px"
                              showWatermark={false}
                            />
                          </div>
                          <h3 className="font-news-headline text-sm leading-snug line-clamp-3">
                            <MixedScriptText text={item.title} />
                          </h3>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}

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
