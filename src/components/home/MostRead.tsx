import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/types";

export function MostRead({ articles }: { articles: Article[] }) {
  return (
    <aside className="border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 bg-fh-black px-4 py-3">
        <h2 className="font-heading text-sm font-bold tracking-wider text-white uppercase">
          වැඩිපුරම කියවන පුවත්
        </h2>
      </div>
      <ol className="divide-y divide-neutral-100">
        {articles.map((article, i) => (
          <li key={article.id}>
            <Link
              href={`/news/${article.slug}`}
              className="flex gap-3 p-3 transition hover:bg-fh-surface"
            >
              <span className="font-heading text-xl font-extrabold text-fh-red">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-neutral-200">
                <Image
                  src={article.image}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-heading text-sm font-bold leading-snug line-clamp-2">
                  {article.title}
                </h3>
                <p className="mt-1 text-[11px] text-fh-muted">
                  {article.publishedAt}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
