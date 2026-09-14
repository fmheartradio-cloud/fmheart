import { cmsFetch } from "@/lib/cms-fetch";
import { formatSriLankaDateTime } from "@/lib/datetime";
import { getAdminDb } from "@/lib/db/compat";
import { finalizeCoverUrl } from "@/lib/image-url";
import { toHeroExcerpt, toPlainText } from "@/lib/plain-text";
import { listArticles, mapFirebaseError } from "@/services/articles";
import type { Article } from "@/types";
import type { CmsArticle } from "@/types/cms";

const HERO_NEWS_LIMIT = 10;
const SETTINGS_DOC = "hero";

export type HeroSlideInput = {
  title: string;
  excerpt?: string;
  category: string;
  image: string;
  slug: string;
};

function normalizeSlides(raw: unknown): Article[] {
  if (!Array.isArray(raw)) return [];
  const out: Article[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const title =
      typeof row.title === "string" ? toPlainText(row.title).trim() : "";
    const image = typeof row.image === "string" ? row.image.trim() : "";
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    const category =
      typeof row.category === "string" ? row.category.trim() : "News";
    if (!title || !image || !slug) return;
    const excerpt =
      typeof row.excerpt === "string" ? row.excerpt.trim() : undefined;
    out.push({
      id: typeof row.id === "string" && row.id ? row.id : `hero-${i + 1}`,
      title,
      excerpt: excerpt || undefined,
      category: category || "News",
      image,
      slug,
      publishedAt:
        typeof row.publishedAt === "string" && row.publishedAt
          ? row.publishedAt
          : "දැන්",
    });
  });
  return out;
}

export function cmsToHeroSlide(article: CmsArticle): Article {
  const excerpt = toHeroExcerpt(article.excerpt, article.body, 280);
  return {
    id: article.id,
    title: article.title,
    excerpt: excerpt || undefined,
    category: article.category,
    image:
      finalizeCoverUrl(article.coverImage || "") || "/logo/fmheart-cover.png",
    publishedAt: article.publishedAt
      ? formatSriLankaDateTime(article.publishedAt)
      : "දැන්",
    slug: article.slug,
  };
}

export async function getLatestNewsHeroSlides(): Promise<Article[]> {
  try {
    const articles = await listArticles({
      type: "news",
      status: "published",
      limit: HERO_NEWS_LIMIT,
    });
    return articles.map(cmsToHeroSlide);
  } catch (err) {
    console.warn("[hero] latest news read failed:", err);
    return [];
  }
}

export async function getCmsHeroSlides(): Promise<Article[]> {
  if (typeof window !== "undefined") {
    const data = await cmsFetch<{ slides: Article[] }>(
      "/api/admin/settings?key=hero",
    );
    return data.slides || [];
  }
  try {
    const db = getAdminDb();
    if (!db) return [];
    const snap = await db.collection("settings").doc(SETTINGS_DOC).get();
    if (!snap.exists) return [];
    return normalizeSlides(snap.data()?.slides);
  } catch (err) {
    console.warn("[hero] CMS read failed:", err);
    return [];
  }
}

export async function getHeroSlides(): Promise<Article[]> {
  return getLatestNewsHeroSlides();
}

export async function saveHeroSlides(
  slides: HeroSlideInput[],
): Promise<Article[]> {
  if (typeof window !== "undefined") {
    const data = await cmsFetch<{ slides: Article[] }>("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ key: "hero", slides }),
    });
    return data.slides || [];
  }

  const db = getAdminDb();
  if (!db) {
    throw new Error(
      "Turso configured නැහැ. TURSO_DATABASE_URL සහ TURSO_AUTH_TOKEN දාන්න.",
    );
  }

  const cleaned = normalizeSlides(
    slides.map((s, i) => ({
      id: `hero-${i + 1}`,
      title: s.title,
      excerpt: s.excerpt || "",
      category: s.category,
      image: s.image,
      slug: s.slug,
      publishedAt: "දැන්",
    })),
  );

  if (cleaned.length === 0) {
    throw new Error("අඩු තරමේ hero slide එකක් ඕන (title, image, slug).");
  }

  try {
    await db.collection("settings").doc(SETTINGS_DOC).set(
      {
        slides: cleaned,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return cleaned;
  } catch (err) {
    throw new Error(mapFirebaseError(err));
  }
}

export function emptyHeroSlide(): HeroSlideInput {
  return {
    title: "",
    excerpt: "",
    category: "BREAKING NEWS",
    image: "",
    slug: "",
  };
}

export function articleToHeroInput(a: {
  title: string;
  excerpt?: string;
  category: string;
  coverImage?: string;
  image?: string;
  slug: string;
}): HeroSlideInput {
  return {
    title: a.title,
    excerpt: a.excerpt || "",
    category: a.category,
    image: a.coverImage || a.image || "",
    slug: a.slug,
  };
}
