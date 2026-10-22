"use client";

import { useEffect, useState, type FormEvent } from "react";
import { HOME_AD_SLOTS } from "@/lib/ad-placements";
import {
  emptyAdsSettings,
  getCmsAds,
  saveAds,
} from "@/services/ads";
import type { AdsSettings, DirectAdBanner, HomeAdSlotId } from "@/types/ads";

const FIELD =
  "mt-1 w-full border border-neutral-300 bg-white px-3 py-3 text-base outline-none focus:ring-2 focus:ring-fh-red";

function SlotCard({
  slotId,
  title,
  titleSi,
  location,
  sizes,
  banner,
  onChange,
}: {
  slotId: HomeAdSlotId;
  title: string;
  titleSi: string;
  location: string;
  sizes: readonly string[];
  banner: DirectAdBanner;
  onChange: (patch: Partial<DirectAdBanner>) => void;
}) {
  return (
    <section className="border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-heading text-lg font-extrabold">{title}</p>
          <p className="text-sm text-fh-muted">{titleSi}</p>
          <p className="mt-1 text-xs text-fh-muted">{location}</p>
          <p className="mt-1 font-heading text-xs font-bold tracking-wide text-fh-red">
            {sizes.join(" · ")}
          </p>
        </div>
        <label className="flex min-h-11 shrink-0 items-center gap-2 self-start rounded-sm bg-fh-surface px-3 py-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={banner.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            className="size-5 accent-fh-red"
          />
          Show this banner
        </label>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="text-sm font-semibold text-fh-ink">
          Image URL
          <input
            type="url"
            inputMode="url"
            placeholder="https://…/banner.jpg"
            value={banner.imageUrl}
            onChange={(e) => onChange({ imageUrl: e.target.value })}
            className={FIELD}
          />
        </label>
        <label className="text-sm font-semibold text-fh-ink">
          Click link
          <input
            type="url"
            inputMode="url"
            placeholder="https://brand.lk or /promotion"
            value={banner.href}
            onChange={(e) => onChange({ href: e.target.value })}
            className={FIELD}
          />
        </label>
        <label className="text-sm font-semibold text-fh-ink">
          Alt text
          <input
            type="text"
            placeholder="Brand name"
            value={banner.alt}
            onChange={(e) => onChange({ alt: e.target.value })}
            className={FIELD}
          />
        </label>
      </div>

      {banner.imageUrl ? (
        <div className="mt-4 border border-dashed border-neutral-200 bg-neutral-50 p-2">
          <p className="mb-2 text-[11px] tracking-wider text-fh-muted uppercase">
            Preview · {slotId}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner.imageUrl}
            alt={banner.alt || title}
            className="mx-auto max-h-48 w-full object-contain"
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-fh-muted">
          Image URL එකක් දැම්මාම preview එක පෙන්වනවා. Enable කරලා Save කරාම
          homepage එකේ මේ slot එකට AdSense ට වඩා මේ banner එක යනවා.
        </p>
      )}
    </section>
  );
}

export default function AdminAdsPage() {
  const [ads, setAds] = useState<AdsSettings>(emptyAdsSettings);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void getCmsAds()
      .then((data) => {
        setAds(data);
        setLoaded(true);
      })
      .catch((err) => {
        setMsg(err instanceof Error ? err.message : "Load failed");
        setLoaded(true);
      });
  }, []);

  function updateBanner(id: HomeAdSlotId, patch: Partial<DirectAdBanner>) {
    setAds((prev) => ({
      ...prev,
      banners: {
        ...prev.banners,
        [id]: { ...prev.banners[id], ...patch },
      },
    }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const saved = await saveAds(ads);
      setAds(saved);
      setMsg("Ad banners saved ✓ — homepage එකේ දැන් පෙන්වනවා.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return <p className="text-sm text-fh-muted">Loading ad banners…</p>;
  }

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-3xl space-y-5 pb-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold md:text-3xl">
          Ad banners
        </h1>
        <p className="mt-1 text-sm text-fh-muted">
          Homepage slot එකකට image URL + click link දාලා enable කරන්න. Empty
          තියෙන slot වලට AdSense හෝ “Promote With Us” placeholder යනවා.
        </p>
      </div>

      {HOME_AD_SLOTS.map((slot) => (
        <SlotCard
          key={slot.id}
          slotId={slot.id}
          title={slot.name}
          titleSi={slot.nameSi}
          location={slot.location}
          sizes={slot.sizes}
          banner={ads.banners[slot.id]}
          onChange={(patch) => updateBanner(slot.id, patch)}
        />
      ))}

      {msg ? (
        <p
          className={`text-sm ${msg.includes("failed") || msg.includes("Failed") ? "text-fh-red" : "text-fh-muted"}`}
        >
          {msg}
        </p>
      ) : null}

      <div className="sticky bottom-20 z-20 border border-neutral-200 bg-white p-3 shadow-lg lg:bottom-4">
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 w-full bg-fh-red font-heading text-base font-bold text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save all banners"}
        </button>
      </div>
    </form>
  );
}
