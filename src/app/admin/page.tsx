"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRadio } from "@/context/RadioProvider";
import { cmsFetch } from "@/lib/cms-fetch";
import { formatDuration } from "@/lib/datetime";
import { getCmsAds, saveAds } from "@/services/ads";
import type { HomeAdSlotId } from "@/types/ads";

type DashNews = {
  id: string;
  title: string;
  image: string;
  date: string;
  views: number;
  status: string;
  slug: string;
};

type DashAd = {
  id: string;
  name: string;
  sizes: string;
  enabled: boolean;
  imageUrl: string;
  live: boolean;
};

type DashPayload = {
  clock: { dateLabel: string; timeLabel: string };
  radio: {
    onAir: boolean;
    live: boolean;
    listeners: number;
    peak: number;
    bitrate: number;
    song: string;
    artist: string;
    titleStartedAt: string | null;
  };
  kpis: {
    liveListeners: number;
    liveDelta: number | null;
    totalToday: number;
    streamHours: number;
    visitors: number;
  };
  listenerSeries: { t: string; n: number }[];
  topTracks: { rank: number; song: string; artist: string; plays: number }[];
  news: DashNews[];
  ads: DashAd[];
  drafts: number;
};

const QUICK = [
  { href: "/admin/articles", label: "Add News", bg: "bg-[#ffe4e6]", icon: "📰" },
  { href: "/admin/music", label: "Upload Song", bg: "bg-[#dbeafe]", icon: "🎵" },
  { href: "/admin/ads", label: "Manage Ads", bg: "bg-[#ffedd5]", icon: "📣" },
  { href: "/admin/schedule", label: "Program Schedule", bg: "bg-[#f3e8ff]", icon: "📅" },
  { href: "/admin/now-playing", label: "Send Announcement", bg: "bg-[#dcfce7]", icon: "📢" },
  { href: "/admin/pages", label: "Website Pages", bg: "bg-[#e5e7eb]", icon: "📄" },
  { href: "/admin/comments", label: "Comments", bg: "bg-[#fce7f3]", icon: "💬" },
  { href: "/admin/analytics", label: "Analytics", bg: "bg-[#cffafe]", icon: "📊" },
  { href: "/admin/settings", label: "Settings", bg: "bg-[#f3f4f6]", icon: "⚙️" },
] as const;

function nfmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function Delta({ value }: { value: number | null }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span className={`text-xs font-bold ${up ? "text-emerald-500" : "text-fh-red"}`}>
      {up ? "↑" : "↓"} {Math.abs(value)}%
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-emerald-100 text-emerald-700",
    draft: "bg-neutral-200 text-neutral-600",
    archived: "bg-orange-100 text-orange-700",
  };
  const label =
    status === "published" ? "Published" : status === "draft" ? "Draft" : "Scheduled";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${map[status] || map.draft}`}>
      {label}
    </span>
  );
}

function KpiCard({
  color,
  icon,
  label,
  value,
  delta,
  hint,
}: {
  color: string;
  icon: string;
  label: string;
  value: string;
  delta?: number | null;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div
        className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-lg text-white ${color}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-fh-muted">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="font-heading text-2xl font-extrabold tracking-tight">{value}</p>
          <Delta value={delta ?? null} />
        </div>
        <p className="text-[11px] text-fh-muted">{hint}</p>
      </div>
    </div>
  );
}

function Waveform({ active }: { active: boolean }) {
  const bars = useMemo(
    () => Array.from({ length: 42 }, (_, i) => 28 + Math.abs(Math.sin(i * 0.55)) * 72),
    [],
  );
  return (
    <div className="flex h-12 items-end gap-[3px]">
      {bars.map((h, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full ${i < 20 ? "bg-fh-red" : "bg-neutral-200"} ${
            active && i < 20 ? "animate-pulse" : ""
          }`}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function ListenersChart({ points }: { points: { t: string; n: number }[] }) {
  const w = 640;
  const h = 200;
  const pad = 28;
  if (points.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-fh-muted">
        Listener history එක collect වෙන ගමන් chart එක fill වෙනවා.
      </p>
    );
  }
  const max = Math.max(...points.map((p) => p.n), 1);
  const xs = points.map(
    (_, i) => pad + (i / (points.length - 1)) * (w - pad * 2),
  );
  const ys = points.map(
    (p) => h - pad - (p.n / max) * (h - pad * 2),
  );
  const line = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)},${ys[i]!.toFixed(1)}`).join(" ");
  const area = `${line} L${xs[xs.length - 1]},${h - pad} L${xs[0]},${h - pad} Z`;
  const last = points[points.length - 1]!;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * (1 - t)));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-48 w-full">
      {ticks.map((label, i) => {
        const y = pad + (i / (ticks.length - 1)) * (h - pad * 2);
        return (
          <g key={i}>
            <line x1={pad} x2={w - pad} y1={y} y2={y} stroke="#eef1f6" />
            <text x={8} y={y + 4} fontSize="10" fill="#9aa3b2">
              {label >= 1000 ? `${(label / 1000).toFixed(0)}K` : label}
            </text>
          </g>
        );
      })}
      <path d={area} fill="rgba(213,0,0,0.12)" />
      <path d={line} fill="none" stroke="#d50000" strokeWidth="2.5" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="5" fill="#d50000" />
      <text
        x={xs[xs.length - 1]! - 8}
        y={ys[ys.length - 1]! - 10}
        textAnchor="end"
        fontSize="11"
        fontWeight="700"
        fill="#111"
      >
        {nfmt(last.n)}
      </text>
    </svg>
  );
}

export default function AdminOverviewPage() {
  const radio = useRadio();
  const [data, setData] = useState<DashPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await cmsFetch<DashPayload>("/api/admin/dashboard");
      setData(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dashboard load failed");
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(t);
  }, [load]);

  async function radioAction(action: "start" | "stop" | "refresh") {
    setBusy(action);
    setNotice(null);
    try {
      if (action === "start") await radio.play();
      if (action === "stop") radio.pause();
      const res = await cmsFetch<{ notice?: string }>("/api/admin/radio", {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      if (res.notice) setNotice(res.notice);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Radio action failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggleAd(id: string, enabled: boolean) {
    try {
      const ads = await getCmsAds();
      const slot = id as HomeAdSlotId;
      ads.banners[slot] = {
        ...ads.banners[slot],
        enabled,
      };
      await saveAds(ads);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Ad update failed");
    }
  }

  const elapsed = data?.radio.titleStartedAt
    ? formatDuration((Date.now() - Date.parse(data.radio.titleStartedAt)) / 1000)
    : "00:00";

  if (error && !data) {
    return <p className="text-sm text-fh-red">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-fh-muted">Loading dashboard…</p>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold md:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-fh-muted">
            Welcome back! Here&apos;s your radio station overview.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <span className="flex size-9 items-center justify-center rounded-xl bg-red-50 text-fh-red">
            📅
          </span>
          <div className="whitespace-nowrap">
            <p className="text-xs font-semibold">{data.clock.dateLabel}</p>
            <p className="text-[11px] text-fh-muted">{data.clock.timeLabel}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          color="bg-[#ef4444]"
          icon="📡"
          label="Live Listeners"
          value={nfmt(data.kpis.liveListeners)}
          delta={data.kpis.liveDelta}
          hint="Now Listening"
        />
        <KpiCard
          color="bg-[#f472b6]"
          icon="📶"
          label="Peak Listeners"
          value={nfmt(data.kpis.totalToday)}
          hint="Today / stream peak"
        />
        <KpiCard
          color="bg-[#60a5fa]"
          icon="▶"
          label="Total Stream Time"
          value={`${data.kpis.streamHours}h`}
          hint="On air since encoder start"
        />
        <KpiCard
          color="bg-[#fbbf24]"
          icon="👥"
          label="Website Views"
          value={nfmt(data.kpis.visitors)}
          hint="CMS article counters"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-base font-extrabold">
              <span className="text-fh-red">📡</span> Live Radio Control
            </h2>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                data.radio.onAir
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-neutral-200 text-neutral-600"
              }`}
            >
              {data.radio.onAir ? "ON AIR" : "OFF AIR"}
            </span>
          </div>

          <div className="flex gap-3">
            <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl bg-fh-ink">
              <Image
                src="/logo/fmheart-badge.png"
                alt=""
                fill
                className="object-contain p-2"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold tracking-wider text-fh-red">
                NOW PLAYING
              </p>
              <p className="truncate font-heading text-lg font-extrabold">
                {data.radio.song}
              </p>
              <p className="truncate text-sm text-fh-muted">{data.radio.artist}</p>
            </div>
            <button
              type="button"
              onClick={() => void radio.toggle()}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f4f6fb] text-lg"
              aria-label={radio.isPlaying ? "Pause monitor" : "Play monitor"}
            >
              {radio.isPlaying ? "❚❚" : "▶"}
            </button>
          </div>

          <div className="mt-4">
            <Waveform active={data.radio.onAir} />
            <div className="mt-1 flex justify-between text-[11px] text-fh-muted">
              <span>{elapsed}</span>
              <span>LIVE</span>
            </div>
          </div>

          <label className="mt-3 flex items-center gap-3">
            <span className="text-fh-muted">🔊</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={radio.volume}
              onChange={(e) => radio.setVolume(Number(e.target.value))}
              className="w-full accent-fh-red"
            />
            <span className="w-10 text-right text-xs font-bold">
              {Math.round(radio.volume * 100)}%
            </span>
          </label>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void radioAction("start")}
              className="min-h-11 rounded-full bg-fh-red text-xs font-extrabold text-white"
            >
              ▶ Start Stream
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void radioAction("stop")}
              className="min-h-11 rounded-full border border-fh-red text-xs font-extrabold text-fh-red"
            >
              ■ Stop Stream
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void radioAction("refresh")}
              className="min-h-11 rounded-full border border-black/10 text-xs font-extrabold"
            >
              ↻ Refresh Info
            </button>
          </div>
          {notice ? <p className="mt-3 text-xs text-fh-muted">{notice}</p> : null}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 font-heading text-base font-extrabold">
            <span className="text-fh-red">⚡</span> Quick Actions
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            {QUICK.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={`flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl px-2 text-center ${item.bg}`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-[11px] leading-tight font-bold">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-extrabold">Recent News</h2>
            <Link href="/admin/articles" className="text-xs font-bold text-fh-red">
              View All
            </Link>
          </div>
          <ul className="divide-y divide-neutral-100">
            {data.news.length === 0 ? (
              <li className="py-6 text-sm text-fh-muted">No articles yet.</li>
            ) : (
              data.news.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{item.title}</p>
                    <p className="text-[11px] text-fh-muted">
                      {item.date}
                      {item.views ? ` · ${item.views} views` : ""}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-extrabold">Advertisement Slots</h2>
            <Link href="/admin/ads" className="text-xs font-bold text-fh-red">
              Manage Ads
            </Link>
          </div>
          <ul className="space-y-2.5">
            {data.ads.map((ad) => (
              <li key={ad.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{ad.name}</p>
                  <p className="text-[11px] text-fh-muted">{ad.sizes}</p>
                </div>
                <div className="relative h-10 w-24 overflow-hidden rounded-lg bg-neutral-100">
                  {ad.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ad.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[10px] text-fh-muted">
                      empty
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void toggleAd(ad.id, !ad.enabled)}
                  className={`h-6 w-11 rounded-full ${ad.enabled ? "bg-emerald-400" : "bg-neutral-300"}`}
                  aria-label={`Toggle ${ad.name}`}
                >
                  <span
                    className={`block size-5 translate-y-0.5 rounded-full bg-white shadow ${
                      ad.enabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-heading text-base font-extrabold">Listeners (Last 24 Hours)</h2>
            <span className="rounded-full bg-[#f4f6fb] px-2.5 py-1 text-[11px] font-bold">
              Last 24 Hours
            </span>
          </div>
          <ListenersChart points={data.listenerSeries} />
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-extrabold">Top Tracks (Today)</h2>
            <Link href="/admin/now-playing" className="text-xs font-bold text-fh-red">
              View All
            </Link>
          </div>
          <ol className="space-y-3">
            {data.topTracks.length === 0 ? (
              <li className="text-sm text-fh-muted">
                Now-playing history එක එකතු වෙනකොට මෙතන පෙන්වනවා.
              </li>
            ) : (
              data.topTracks.map((t) => (
                <li key={t.rank} className="flex items-center gap-3">
                  <span className="w-5 font-heading text-sm font-extrabold text-fh-muted">
                    {t.rank}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{t.song}</p>
                    <p className="truncate text-[11px] text-fh-muted">{t.artist}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-500">
                    {nfmt(t.plays)}
                  </span>
                </li>
              ))
            )}
          </ol>
        </section>
      </div>
    </div>
  );
}
