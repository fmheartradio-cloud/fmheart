"use client";

import { useEffect, useState } from "react";
import { cmsFetch } from "@/lib/cms-fetch";

type Dash = {
  kpis: {
    liveListeners: number;
    totalToday: number;
    streamHours: number;
    visitors: number;
  };
  listenerSeries: { t: string; n: number }[];
  published: number;
  drafts: number;
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Dash | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void cmsFetch<Dash>("/api/admin/dashboard")
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : "Load failed"));
  }, []);

  if (err) return <p className="text-sm text-fh-red">{err}</p>;
  if (!data) return <p className="text-sm text-fh-muted">Loading analytics…</p>;

  const cards = [
    ["Live listeners", data.kpis.liveListeners],
    ["Peak listeners", data.kpis.totalToday],
    ["Stream hours", `${data.kpis.streamHours}h`],
    ["Website views", data.kpis.visitors],
    ["Published news", data.published],
    ["Drafts", data.drafts],
  ] as const;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold md:text-3xl">
          Listeners & Analytics
        </h1>
        <p className="mt-1 text-sm text-fh-muted">
          Icecast live counts + CMS article views. GA console වෙනම තියෙනවා.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
          >
            <p className="text-xs text-fh-muted">{label}</p>
            <p className="mt-1 font-heading text-2xl font-extrabold">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <h2 className="font-heading text-lg font-bold">24h listener samples</h2>
        <ul className="mt-3 max-h-80 overflow-auto text-sm">
          {data.listenerSeries.length === 0 ? (
            <li className="text-fh-muted">No samples yet — open Dashboard to start logging.</li>
          ) : (
            [...data.listenerSeries].reverse().map((p) => (
              <li key={p.t} className="flex justify-between border-b border-neutral-100 py-2">
                <span className="text-fh-muted">
                  {new Date(p.t).toLocaleString("en-GB")}
                </span>
                <span className="font-bold">{p.n}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
