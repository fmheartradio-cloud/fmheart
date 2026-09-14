import { videos as mockVideos } from "@/data/mock";
import { cmsFetch } from "@/lib/cms-fetch";
import { getAdminDb, isDbConfigured } from "@/lib/db/compat";
import { mapFirebaseError } from "@/services/articles";
import type { VideoItem } from "@/types";

const SETTINGS_DOC = "videos";

export type VideoInput = {
  id?: string;
  title: string;
  thumbnail: string;
  duration?: string;
  views?: string;
  publishedAt?: string;
  slug?: string;
  videoUrl?: string;
};

function slugify(text: string): string {
  const ascii = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  if (ascii.length >= 3) return ascii;
  return `video-${Date.now().toString(36)}`;
}

function youtubeThumb(url: string): string {
  const m =
    url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/,
    ) || url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (!m?.[1]) return "";
  return `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`;
}

export function emptyVideoInput(): VideoInput {
  return {
    title: "",
    thumbnail: "",
    duration: "",
    views: "0",
    publishedAt: "",
    slug: "",
    videoUrl: "",
  };
}

export function normalizeVideos(raw: unknown): VideoItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, i) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const title = typeof r.title === "string" ? r.title.trim() : "";
      if (!title) return null;
      const videoUrl = typeof r.videoUrl === "string" ? r.videoUrl.trim() : "";
      const thumbnailRaw =
        typeof r.thumbnail === "string" ? r.thumbnail.trim() : "";
      const thumbnail =
        thumbnailRaw || (videoUrl ? youtubeThumb(videoUrl) : "");
      if (!thumbnail) return null;
      const slug =
        typeof r.slug === "string" && r.slug.trim()
          ? r.slug.trim()
          : slugify(title);
      return {
        id:
          typeof r.id === "string" && r.id.trim()
            ? r.id.trim()
            : `video-${i + 1}`,
        title,
        thumbnail,
        duration:
          typeof r.duration === "string" && r.duration.trim()
            ? r.duration.trim()
            : "0:00",
        views:
          typeof r.views === "string" && r.views.trim()
            ? r.views.trim()
            : "0",
        publishedAt:
          typeof r.publishedAt === "string" && r.publishedAt.trim()
            ? r.publishedAt.trim()
            : "දැන්",
        slug,
        ...(videoUrl ? { videoUrl } : {}),
      } satisfies VideoItem;
    })
    .filter((v): v is VideoItem => Boolean(v));
}

async function readVideos(): Promise<VideoItem[] | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection("settings").doc(SETTINGS_DOC).get();
  if (!snap.exists) return [];
  return normalizeVideos(snap.data()?.items);
}

export async function getPublicVideos(limit = 12): Promise<VideoItem[]> {
  try {
    const items = await readVideos();
    if (items === null) {
      return process.env.NODE_ENV === "production"
        ? []
        : mockVideos.slice(0, limit);
    }
    return items.length > 0 ? items.slice(0, limit) : [];
  } catch (err) {
    console.warn("[videos] public read failed:", err);
    return [];
  }
}

export async function getCmsVideos(): Promise<VideoItem[]> {
  if (typeof window !== "undefined") {
    const data = await cmsFetch<{ items: VideoItem[] }>(
      "/api/admin/settings?key=videos",
    );
    return data.items || [];
  }
  try {
    return (await readVideos()) || [];
  } catch (err) {
    console.warn("[videos] CMS read failed:", err);
    return [];
  }
}

export async function saveVideos(inputs: VideoInput[]): Promise<VideoItem[]> {
  if (typeof window !== "undefined") {
    const data = await cmsFetch<{ items: VideoItem[] }>("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ key: "videos", items: inputs }),
    });
    return data.items || [];
  }

  const db = getAdminDb();
  if (!db) {
    throw new Error(
      "Turso configured නැහැ. TURSO_DATABASE_URL සහ TURSO_AUTH_TOKEN දාන්න.",
    );
  }

  const cleaned = normalizeVideos(
    inputs.map((v, i) => ({
      id: v.id?.trim() || `video-${i + 1}`,
      title: v.title,
      thumbnail: v.thumbnail,
      duration: v.duration || "0:00",
      views: v.views || "0",
      publishedAt: v.publishedAt || new Date().toISOString().slice(0, 10),
      slug: v.slug || slugify(v.title),
      videoUrl: v.videoUrl || "",
    })),
  );

  try {
    await db.collection("settings").doc(SETTINGS_DOC).set(
      {
        items: cleaned,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return cleaned;
  } catch (err) {
    throw new Error(mapFirebaseError(err));
  }
}
