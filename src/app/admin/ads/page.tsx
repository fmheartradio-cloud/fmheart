"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { HOME_AD_SLOTS } from "@/lib/ad-placements";
import {
  emptyAdsSettings,
  getCmsAds,
  saveAds,
} from "@/services/ads";
import type { AdsSettings, DirectAdBanner, HomeAdSlotId } from "@/types/ads";

const FIELD =
  "mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base outline-none focus:ring-2 focus:ring-fh-red";

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", "ad");
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!res.ok || !data.url) {
    throw new Error(data.error || "Upload failed");
  }
  return data.url;
}

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
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const url = await uploadImage(file);
      onChange({ imageUrl: url, enabled: true });
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-heading text-lg font-extrabold">{title}</p>
          <p className="text-sm text-fh-muted">{titleSi}</p>
          <p className="mt-1 text-xs text-fh-muted">{location}</p>
          <p className="mt-1 font-heading text-xs font-bold tracking-wide text-fh-red">
            {sizes.join(" · ")}
          </p>
        </div>
        <label className="flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full bg-[#f4f6fb] px-3 py-2 text-sm font-semibold">
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
        <div>
          <p className="text-sm font-semibold text-fh-ink">Ad image</p>
          <label className="mt-1 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-[#f8f9fc] px-4 py-5 text-center hover:border-fh-red/60">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => void onFile(e)}
            />
            <span className="font-heading text-sm font-bold">
              {uploading ? "Uploading…" : "Upload image"}
            </span>
            <span className="mt-1 text-xs text-fh-muted">
              Phone / computer එකෙන් JPG, PNG, WebP තෝරන්න
            </span>
          </label>
          {uploadErr ? (
            <p className="mt-2 text-sm text-fh-red">{uploadErr}</p>
          ) : null}
        </div>

        <label className="text-sm font-semibold text-fh-ink">
          or paste image URL
          <input
            type="text"
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
            type="text"
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
        <div className="mt-4 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-2">
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
          Upload කරලා හෝ URL එකක් දැම්මාම preview එක පෙන්වනවා. Enable + Save
          කරාම homepage එකේ මේ slot එකට යනවා.
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
          Image එක upload කරන්න, නැත්නම් link එකක් paste කරන්න. Click link එකත්
          දාලා Save කරන්න.
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

      <div className="sticky bottom-4 z-20 rounded-2xl border border-neutral-200 bg-white p-3 shadow-lg">
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 w-full rounded-full bg-fh-red font-heading text-base font-bold text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save all banners"}
        </button>
      </div>
    </form>
  );
}
