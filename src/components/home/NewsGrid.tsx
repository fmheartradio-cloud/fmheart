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
  /** How many cards to show on mobile (1-col). Defaults to maxRows. */
  mobileCount?: number;
};

export function NewsGrid({
  title,
  articles,
  viewAllHref = "#",
  maxRows,
  mobileCount,
}: NewsGridProps) {
  if (!articles.length) {
    return null;
  }

  const rows = maxRows && maxRows > 0 ? maxRows : null;
  const mobileCap =
    rows != null
      ? mobileCount && mobileCount > 0
        ? mobileCount
        : rows * 1
      : null;
  const tabletCap = rows != null ? rows * 2 : null;
  const desktopCap = rows != null ? rows * 3 : null;
  const visibleCount = Math.max(
    mobileCap ?? 0,
    tabletCap ?? 0,
    desktopCap ?? 0,
  );
  const visible =
    visibleCount > 0 ? articles.slice(0, visibleCount) : articles;

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
          const classes = ["group", "min-w-0"];
          if (mobileCap != null && i >= mobileCap) classes.push("hidden");
          if (tabletCap != null) {
            if (i >= tabletCap) classes.push("sm:hidden");
            else if (mobileCap != null && i >= mobileCap) classes.push("sm:block");
          }
          if (desktopCap != null) {
            if (i >= desktopCap) classes.push("lg:hidden");
            else if (tabletCap != null && i >= tabletCap) classes.push("lg:block");
          }
          return (
            <article key={article.id} className={classes.join(" ")}>
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
