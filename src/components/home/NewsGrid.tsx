import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";

export type NewsCard = {
  id: string;
  title: string;
  category: string;
  image: string;
  publishedAt: string;
  slug: string;
  href?: string;
};

type NewsGridProps = {
  title: string;
  articles: NewsCard[];
  viewAllHref?: string;
  /** Cap visible cards to this many grid rows (1 / 2 / 3 cols). */
  maxRows?: number;
};

export function NewsGrid({
  title,
  articles,
  viewAllHref = "#",
  maxRows,
}: NewsGridProps) {
  if (!articles.length) {
    return null;
  }

  const rows = maxRows && maxRows > 0 ? maxRows : null;
  // Cap at 3 columns × maxRows so large screens never grow past 2 rows.
  const visible = rows ? articles.slice(0, rows * 3) : articles;
  const mobileCap = rows ? rows * 1 : null;
  const tabletCap = rows ? rows * 2 : null;
  const desktopCap = rows ? rows * 3 : null;

  return (
    <section className="animate-fade-up w-full max-w-full min-w-0 overflow-x-clip">
      <div className="mb-4 flex items-end justify-between gap-3 border-b-2 border-fh-red pb-2">
        <h2 className="font-heading text-xl font-extrabold text-fh-ink md:text-2xl">
          {title}
        </h2>
        <Link
          href={viewAllHref}
          className="text-xs font-semibold tracking-wide text-fh-red hover:underline md:text-sm"
        >
          සියල්ල බලන්න →
        </Link>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 lg:gap-6 xl:grid-cols-3">
        {visible.map((article, i) => {
          const href = article.href || `/news/${article.slug}`;
          const hideMobile =
            mobileCap != null && i >= mobileCap ? "hidden" : "";
          const showTablet =
            tabletCap != null && i >= (mobileCap ?? 0) && i < tabletCap
              ? "sm:block"
              : "";
          const hideTablet =
            desktopCap != null && i >= (tabletCap ?? 0)
              ? "sm:hidden lg:block"
              : "";
          return (
            <article
              key={article.id}
              className={`group min-w-0 ${hideMobile} ${showTablet} ${hideTablet}`.trim()}
            >
              <Link href={href} className="block w-full max-w-full">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-200">
                  <CoverImage
                    src={article.image}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) calc(100vw - 1.5rem), (max-width: 1024px) calc(50vw - 1rem), 33vw"
                  />
                </div>
                <h3 className="font-news-headline mt-2.5 break-words text-[15px] leading-snug text-fh-ink transition group-hover:text-fh-red md:text-base">
                  {article.title}
                </h3>
                <time className="mt-1 block text-xs text-fh-muted">
                  {article.publishedAt}
                </time>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
