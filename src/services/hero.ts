import { heroSlides as mockSlides } from "@/data/mock";
import { formatSriLankaDateTime } from "@/lib/datetime";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { finalizeCoverUrl, upgradeImageUrl } from "@/lib/image-url";
import { toHeroExcerpt } from "@/lib/plain-text";
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

async function tryFirestore() {
  if (!isFirebaseConfigured()) return null;
  const { getDb } = await import("@/lib/firebase/client");
  return getDb();
}

function normalizeSlides(raw: unknown): Article[] {
  if (!Array.isArray(raw)) return [];
  const out: Article[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
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

/** Map a published news article to a homepage hero slide. */
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

/** Homepage hero — 10 newest published news (Sinhala filter via listArticles). */
export async function getLatestNewsHeroSlides(): Promise<Article[]> {
  try {
    const articles = await listArticles({
      type: "news",
      status: "published",
      limit: HERO_NEWS_LIMIT,
    });
    if (articles.length === 0) return mockSlides;
    return articles.map(cmsToHeroSlide);
  } catch (err) {
    console.warn("[hero] latest news read failed:", err);
    return mockSlides;
  }
}

/** Admin CMS read — Firestore settings/hero (homepage ignores this). */
export async function getCmsHeroSlides(): Promise<Article[]> {
  try {
    const db = await tryFirestore();
    if (!db) return mockSlides;

    const { doc, getDoc } = await import("firebase/firestore");
    const snap = await getDoc(doc(db, "settings", SETTINGS_DOC));
    if (!snap.exists()) return mockSlides;

    const slides = normalizeSlides(snap.data()?.slides);
    return slides.length > 0 ? slides : mockSlides;
  } catch (err) {
    console.warn("[hero] CMS read failed:", err);
    return mockSlides;
  }
}

/** @deprecated Use getLatestNewsHeroSlides (public) or getCmsHeroSlides (admin). */
export async function getHeroSlides(): Promise<Article[]> {
  return getLatestNewsHeroSlides();
}

/** Admin write — requires signed-in admin */
export async function saveHeroSlides(
  slides: HeroSlideInput[],
): Promise<Article[]> {
  const db = await tryFirestore();
  if (!db) {
    throw new Error(
      "Firebase configured නැහැ. .env.local එකේ Firebase keys දාන්න.",
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
    const { doc, setDoc } = await import("firebase/firestore");
    await setDoc(
      doc(db, "settings", SETTINGS_DOC),
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
