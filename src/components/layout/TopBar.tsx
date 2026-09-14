"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MixedScriptText } from "@/components/ui/MixedScriptText";
import type { BreakingItem } from "@/services/breaking";
import { SITE } from "@/lib/site";

const fallbackItems: BreakingItem[] = [
  { title: "FM Heart Live News", href: "/news" },
];

export function TopBar() {
  const [items, setItems] = useState<BreakingItem[]>(fallbackItems);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/news/home", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: {
          news?: Array<{ title: string; href?: string; slug?: string }>;
        } | null) => {
          if (cancelled || !data?.news?.length) return;
          setItems(
            data.news.slice(0, 10).map((a) => ({
              title: a.title,
              href: a.href || `/news/${encodeURIComponent(a.slug || "")}`,
            })),
          );
        },
      )
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loop = [...items, ...items];
  const social = [
    { label: "Facebook", href: SITE.social.facebook },
    { label: "YouTube", href: SITE.social.youtube },
    { label: "TikTok", href: SITE.social.tiktok },
    { label: "Instagram", href: SITE.social.instagram },
  ];

  return (
    <div className="bg-fh-black text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-1.5 md:px-4">
        <span className="shrink-0 bg-fh-red px-2.5 py-1 font-heading text-[11px] font-extrabold tracking-wider uppercase md:text-xs">
          BREAKING
        </span>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="animate-ticker flex w-max gap-12 whitespace-nowrap font-news-headline text-xs md:text-sm">
            {loop.map((item, i) => (
              <Link
                key={`${item.href}-${i}`}
                href={item.href}
                className="text-neutral-200 transition hover:text-white"
              >
                <MixedScriptText text={item.title} />
              </Link>
            ))}
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          {social.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] tracking-wide text-neutral-400 transition hover:text-white"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
