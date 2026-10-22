"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  AD_PAGE_PLACEMENTS,
  HOME_AD_SLOT_PIXELS,
  HOME_AD_SLOTS,
  slotSizeLabel,
} from "@/lib/ad-placements";
import {
  emptyAdsSettings,
  getCmsAds,
  saveAds,
} from "@/services/ads";
import {
  isLiveBanner,
  type AdsSettings,
  type DirectAdBanner,
  type HomeAdSlotId,
} from "@/types/ads";

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleLocalFile(file: File) {
    setUploading(true);
    setUploadErr(null);
    setFileName(file.name);
    try {
      const url = await uploadImage(file);
      onChange({ imageUrl: url, enabled: true });
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void handleLocalFile(file);
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
          <p className="text-sm font-semibold text-fh-ink">
            Banner image (local file)
          </p>
          <div className="mt-1 flex flex-col gap-2 rounded-xl border border-neutral-200 bg-[#f8f9fc] p-3 sm:flex-row sm:items-center">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={onFile}
              className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-fh-red file:px-4 file:py-2 file:font-heading file:text-sm file:font-bold file:text-white"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="min-h-11 shrink-0 rounded-full bg-fh-red px-5 font-heading text-sm font-bold text-white disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Browse computer"}
            </button>
          </div>
          <p className="mt-1 text-xs text-fh-muted">
            Computer එකෙන් JPG / PNG / WebP file එකක් Browse කරලා තෝරන්න.
            {fileName ? ` Selected: ${fileName}` : ""}
          </p>
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
            Preview · {slotId} · {HOME_AD_SLOT_PIXELS[slotId].width}×
            {HOME_AD_SLOT_PIXELS[slotId].height}
          </p>
          <div
            className="mx-auto overflow-hidden bg-white"
            style={{
              width: "100%",
              maxWidth: HOME_AD_SLOT_PIXELS[slotId].width,
              aspectRatio: `${HOME_AD_SLOT_PIXELS[slotId].width} / ${HOME_AD_SLOT_PIXELS[slotId].height}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={banner.imageUrl}
              alt={banner.alt || title}
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-fh-muted">
          Upload කරලා හෝ URL එකක් දැම්මාම preview එක පෙන්වනවා. Enable + Save
          කරාම homepage සහ inner pages එකේ මේ slot එකට යනවා.
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
  const [previewId, setPreviewId] = useState<HomeAdSlotId | null>(null);

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
      setMsg("Ad banners saved ✓ — homepage සහ inner pages එකේ දැන් පෙන්වනවා.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return <p className="text-sm text-fh-muted">Loading ad banners…</p>;
  }

  const previewBanner = previewId ? ads.banners[previewId] : null;
  const previewPx = previewId ? HOME_AD_SLOT_PIXELS[previewId] : null;

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-5xl space-y-5 pb-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold md:text-3xl">
          Ad banners
        </h1>
        <p className="mt-1 text-sm text-fh-muted">
          Browse computer කරලා local banner file එකක් තෝරන්න. ඕන නම් image
          URL එකක් paste කරන්නත් පුළුවන්. Slot එකේ ලියලා තියෙන resolution
          එකටම design කරන්න — phone එකේත් desktop එකේත් ratio එක same.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="border-b border-neutral-100 px-4 py-3 sm:px-5">
          <h2 className="font-heading text-lg font-extrabold">
            Where ads show
          </h2>
          <p className="mt-0.5 text-sm text-fh-muted">
            Inner pages ඇතුළුව banner එක පෙන්වන තැන්. Preview = CMS image.
            View = live page එකේ slot එකට scroll වෙනවා.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-[#f4f6fb] text-xs tracking-wide text-fh-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Slot</th>
                <th className="px-4 py-3 font-semibold">Page</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Size</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {AD_PAGE_PLACEMENTS.map((row) => {
                const banner = ads.banners[row.slotId];
                const live = isLiveBanner(banner);
                const slot = HOME_AD_SLOTS.find((s) => s.id === row.slotId);
                return (
                  <tr key={`${row.slotId}-${row.page}-${row.path}`} className="align-top">
                    <td className="px-4 py-3 font-semibold text-fh-ink">
                      {slot?.name || row.slotId}
                    </td>
                    <td className="px-4 py-3">{row.page}</td>
                    <td className="px-4 py-3 text-fh-muted">{row.location}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {slotSizeLabel(row.slotId)}
                    </td>
                    <td className="px-4 py-3">
                      {live ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                          On
                        </span>
                      ) : (
                        <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-bold text-fh-muted">
                          Off
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewId(row.slotId)}
                          className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-bold"
                        >
                          Preview
                        </button>
                        <a
                          href={`${row.path}#${row.hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-fh-red px-3 py-1.5 text-xs font-bold text-white"
                        >
                          View
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {previewId && previewPx ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close preview"
            onClick={() => setPreviewId(null)}
          />
          <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-heading text-lg font-extrabold">
                  {HOME_AD_SLOTS.find((s) => s.id === previewId)?.name} preview
                </p>
                <p className="text-sm text-fh-muted">
                  {slotSizeLabel(previewId)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewId(null)}
                className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm font-bold"
              >
                Close
              </button>
            </div>
            {previewBanner?.imageUrl ? (
              <div
                className="mt-4 overflow-hidden bg-neutral-50"
                style={{
                  width: "100%",
                  aspectRatio: `${previewPx.width} / ${previewPx.height}`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewBanner.imageUrl}
                  alt={previewBanner.alt || previewId}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <p className="mt-4 text-sm text-fh-muted">
                මේ slot එකට banner image එකක් නැහැ. පහළින් upload කරලා Save
                කරන්න.
              </p>
            )}
          </div>
        </div>
      ) : null}

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
