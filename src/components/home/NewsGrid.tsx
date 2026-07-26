import Image from "next/image";
import Link from "next/link";

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
};

export function NewsGrid({ title, articles, viewAllHref = "#" }: NewsGridProps) {
  if (!articles.length) {
    return (
      <section>
        <div className="mb-4 border-b-2 border-fh-red pb-2">
          <h2 className="font-heading text-xl font-extrabold md:text-2xl">
            {title}
          </h2>
        </div>
        <p className="rounded-md border border-dashed border-neutral-300 bg-fh-surface px-4 py-8 text-center text-sm text-fh-muted">
          තවම published articles නැහැ. CMS එකෙන් Status = <strong>Published</strong>{" "}
          කරලා Save කරන්න.
        </p>
      </section>
    );
  }

  return (
    <section className="animate-fade-up">
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

      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {articles.map((article) => {
          const href = article.href || `/news/${article.slug}`;
          return (
            <article key={article.id} className="group min-w-0">
              <Link href={href} className="block w-full max-w-full">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-200">
                  <Image
                    src={article.image}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <span className="absolute top-2 left-2 bg-fh-red px-2 py-0.5 font-heading text-[10px] font-bold tracking-wide text-white uppercase">
                    {article.category}
                  </span>
                </div>
                <h3 className="font-news-headline mt-2.5 text-[15px] leading-snug text-fh-ink transition group-hover:text-fh-red md:text-base">
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
