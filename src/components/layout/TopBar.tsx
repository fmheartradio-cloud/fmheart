"use client";

import { useEffect, useState } from "react";
import { breakingHeadlines as mockHeadlines } from "@/data/mock";
import { getBreakingHeadlines } from "@/services/breaking";
import { SITE } from "@/lib/site";

export function TopBar() {
  const [headlines, setHeadlines] = useState<string[]>(mockHeadlines);

  useEffect(() => {
    let cancelled = false;
    void getBreakingHeadlines().then((items) => {
      if (!cancelled && items.length > 0) setHeadlines(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loop = [...headlines, ...headlines];
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
          <div className="animate-ticker flex w-max gap-12 whitespace-nowrap font-sans text-xs md:text-sm">
            {loop.map((item, i) => (
              <span key={`${item}-${i}`} className="text-neutral-200">
                {item}
              </span>
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
