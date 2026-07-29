"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  emptyVideoInput,
  getCmsVideos,
  saveVideos,
  type VideoInput,
} from "@/services/videos";

export default function AdminVideosPage() {
  const [items, setItems] = useState<VideoInput[]>([emptyVideoInput()]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void getCmsVideos().then((list) => {
      setItems(
        list.length > 0
          ? list.map((v) => ({
              id: v.id,
              title: v.title,
              thumbnail: v.thumbnail,
              duration: v.duration,
              views: v.views,
              publishedAt: v.publishedAt,
              slug: v.slug,
              videoUrl: v.videoUrl || "",
            }))
          : [emptyVideoInput()],
      );
      setLoaded(true);
    });
  }, []);

  function updateItem(index: number, patch: Partial<VideoInput>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyVideoInput()]);
  }

  function removeItem(index: number) {
    setItems((prev) =>
      prev.length <= 1 ? [emptyVideoInput()] : prev.filter((_, i) => i !== index),
    );
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const saved = await saveVideos(items);
      setItems(
        saved.length > 0
          ? saved.map((v) => ({
              id: v.id,
              title: v.title,
              thumbnail: v.thumbnail,
              duration: v.duration,
              views: v.views,
              publishedAt: v.publishedAt,
              slug: v.slug,
              videoUrl: v.videoUrl || "",
            }))
          : [emptyVideoInput()],
      );
      setMsg(
        saved.length > 0
          ? `Videos saved ✓ (${saved.length})`
          : "Saved empty list — homepage will show mock videos until you add items.",
      );
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-fh-muted">Loading videos…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold md:text-3xl">
          Videos
        </h1>
        <p className="mt-1 text-sm text-fh-muted">
          Homepage සහ /videos page එකට YouTube / video posts add කරන්න. Thumbnail
          හිස් නම් YouTube URL එකෙන් auto ගනී.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-4 border border-neutral-200 bg-white p-5"
      >
        {items.map((item, i) => (
          <div key={item.id || i} className="space-y-2 border border-neutral-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-heading text-sm font-bold">Video {i + 1}</p>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-xs font-semibold text-fh-red hover:underline"
              >
                Remove
              </button>
            </div>
            <input
              required
              placeholder="Title"
              value={item.title}
              onChange={(e) => updateItem(i, { title: e.target.value })}
              className="w-full border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="YouTube / video URL (https://youtube.com/watch?v=…)"
              value={item.videoUrl || ""}
              onChange={(e) => updateItem(i, { videoUrl: e.target.value })}
              className="w-full border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Thumbnail image URL (optional if YouTube URL set)"
              value={item.thumbnail}
              onChange={(e) => updateItem(i, { thumbnail: e.target.value })}
              className="w-full border border-neutral-300 px-3 py-2 text-sm"
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                placeholder="Duration (12:45)"
                value={item.duration || ""}
                onChange={(e) => updateItem(i, { duration: e.target.value })}
                className="w-full border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Views (24K)"
                value={item.views || ""}
                onChange={(e) => updateItem(i, { views: e.target.value })}
                className="w-full border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Slug (optional)"
                value={item.slug || ""}
                onChange={(e) => updateItem(i, { slug: e.target.value })}
                className="w-full border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addItem}
            className="border border-neutral-300 px-4 py-2.5 font-heading text-sm font-bold text-fh-ink hover:bg-fh-surface"
          >
            + Add video
          </button>
          <button
            type="submit"
            disabled={busy}
            className="bg-fh-red px-5 py-2.5 font-heading text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save Videos"}
          </button>
        </div>
        {msg ? <p className="text-sm text-fh-muted">{msg}</p> : null}
      </form>
    </div>
  );
}
