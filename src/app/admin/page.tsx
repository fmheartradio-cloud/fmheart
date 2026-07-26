"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getCmsOverviewStats,
  type CmsOverviewStats,
} from "@/services/analytics";

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="border border-neutral-200 bg-white px-4 py-4">
      <p className="text-[11px] tracking-[0.12em] text-fh-muted uppercase">
        {label}
      </p>
      <p className="mt-1 font-heading text-3xl font-extrabold text-fh-ink">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-fh-muted">{hint}</p> : null}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<CmsOverviewStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getCmsOverviewStats()
      .then(setStats)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load stats"),
      );
  }, []);

  if (error) {
    return <p className="text-sm text-fh-red">{error}</p>;
  }

  if (!stats) {
    return <p className="text-sm text-fh-muted">Loading overview…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold md:text-3xl">
          Overview
        </h1>
        <p className="mt-1 text-sm text-fh-muted">
          Content stats, top posts, and traffic setup.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Articles" value={stats.total} hint={`${stats.published} published`} />
        <Kpi label="Drafts" value={stats.draft} />
        <Kpi label="Total views" value={stats.totalViews} hint="CMS counters" />
        <Kpi
          label="News / Gossip"
          value={`${stats.news} / ${stats.gossip}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-bold">Top posts</h2>
            <Link
              href="/admin/articles"
              className="text-xs font-semibold text-fh-red hover:underline"
            >
              Manage →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-neutral-100">
            {stats.topArticles.length === 0 ? (
              <li className="py-3 text-sm text-fh-muted">No articles yet.</li>
            ) : (
              stats.topArticles.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-heading text-sm font-bold">
                      {a.title}
                    </p>
                    <p className="text-xs text-fh-muted">
                      {a.type} · {a.status}
                    </p>
                  </div>
                  <span className="shrink-0 font-heading text-sm font-bold text-fh-red">
                    {a.views || 0}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="border border-neutral-200 bg-white p-5">
          <h2 className="font-heading text-lg font-bold">Recently updated</h2>
          <ul className="mt-4 divide-y divide-neutral-100">
            {stats.recentArticles.length === 0 ? (
              <li className="py-3 text-sm text-fh-muted">No articles yet.</li>
            ) : (
              stats.recentArticles.map((a) => (
                <li key={a.id} className="py-3">
                  <p className="truncate font-heading text-sm font-bold">
                    {a.title}
                  </p>
                  <p className="text-xs text-fh-muted">
                    {a.updatedAt
                      ? new Date(a.updatedAt).toLocaleString("si-LK")
                      : "—"}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-neutral-200 bg-white p-5">
          <h2 className="font-heading text-lg font-bold">Homepage</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <div>
                <p className="font-heading font-bold">Breaking News</p>
                <p className="text-xs text-fh-muted">
                  {stats.breakingCount} headlines
                </p>
              </div>
              <Link href="/admin/breaking" className="text-fh-red hover:underline">
                Edit
              </Link>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-heading font-bold">Hero Posts</p>
                <p className="text-xs text-fh-muted">
                  {stats.heroCount} slides
                </p>
              </div>
              <Link href="/admin/hero" className="text-fh-red hover:underline">
                Edit
              </Link>
            </div>
          </div>
        </section>

        <section className="border border-neutral-200 bg-white p-5">
          <h2 className="font-heading text-lg font-bold">Traffic (GA4)</h2>
          {stats.gaMeasurementId ? (
            <div className="mt-4 space-y-3">
              <p className="inline-flex bg-fh-black px-2 py-1 text-xs font-bold tracking-wide text-white uppercase">
                Connected
              </p>
              <p className="text-sm text-fh-muted">
                Measurement ID:{" "}
                <code className="text-fh-ink">{stats.gaMeasurementId}</code>
              </p>
              <p className="text-xs text-fh-muted">
                Site-wide pageviews go to Google Analytics. Detailed reports
                open in the GA console.
              </p>
              <a
                href="https://analytics.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex bg-fh-red px-4 py-2.5 font-heading text-sm font-bold text-white hover:bg-fh-red-dark"
              >
                Open Google Analytics
              </a>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="inline-flex bg-neutral-200 px-2 py-1 text-xs font-bold tracking-wide text-fh-ink uppercase">
                Not configured
              </p>
              <p className="text-sm text-fh-muted">
                Vercel / `.env.local` එකට{" "}
                <code className="text-fh-ink">NEXT_PUBLIC_GA_MEASUREMENT_ID</code>{" "}
                (G-…) දාලා redeploy කරන්න. CMS view counters තවමත් වැඩ කරනවා.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
