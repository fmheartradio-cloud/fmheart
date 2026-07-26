import { breakingHeadlines as mockHeadlines, latestNews } from "@/data/mock";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { listArticles, mapFirebaseError } from "@/services/articles";
import type { CmsArticle } from "@/types/cms";

const BREAKING_NEWS_LIMIT = 10;

const SETTINGS_DOC = "breaking";

export type BreakingItem = {
  title: string;
  href: string;
};

async function tryFirestore() {
  if (!isFirebaseConfigured()) return null;
  const { getDb } = await import("@/lib/firebase/client");
  return getDb();
}

function normalizeHeadlines(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function mockBreakingItems(): BreakingItem[] {
  return mockHeadlines.map((title, i) => ({
    title,
    href: latestNews[i]?.slug
      ? `/news/${encodeURIComponent(latestNews[i]!.slug)}`
      : "#",
  }));
}

/** Map a published news article to a breaking ticker item. */
export function cmsToBreakingItem(article: CmsArticle): BreakingItem {
  return {
    title: article.title,
    href: `/news/${encodeURIComponent(article.slug)}`,
  };
}

/** Public ticker — 10 newest published news (Sinhala filter via listArticles). */
export async function getLatestNewsBreakingItems(): Promise<BreakingItem[]> {
  try {
    const articles = await listArticles({
      type: "news",
      status: "published",
      limit: BREAKING_NEWS_LIMIT,
    });
    if (articles.length === 0) return mockBreakingItems();
    return articles.map(cmsToBreakingItem);
  } catch (err) {
    console.warn("[breaking] latest news read failed:", err);
    return mockBreakingItems();
  }
}

/** Admin CMS read — Firestore settings/breaking (homepage ignores this). */
export async function getCmsBreakingHeadlines(): Promise<string[]> {
  try {
    const db = await tryFirestore();
    if (!db) return mockHeadlines;

    const { doc, getDoc } = await import("firebase/firestore");
    const snap = await getDoc(doc(db, "settings", SETTINGS_DOC));
    if (!snap.exists()) return mockHeadlines;

    const headlines = normalizeHeadlines(snap.data()?.headlines);
    return headlines.length > 0 ? headlines : mockHeadlines;
  } catch (err) {
    console.warn("[breaking] CMS read failed:", err);
    return mockHeadlines;
  }
}

/** @deprecated Use getLatestNewsBreakingItems (public) or getCmsBreakingHeadlines (admin). */
export async function getBreakingHeadlines(): Promise<string[]> {
  const items = await getLatestNewsBreakingItems();
  return items.map((item) => item.title);
}

/** Admin write — requires signed-in admin */
export async function saveBreakingHeadlines(
  headlines: string[],
): Promise<string[]> {
  const db = await tryFirestore();
  if (!db) {
    throw new Error(
      "Firebase configured නැහැ. .env.local එකේ Firebase keys දාන්න.",
    );
  }

  const cleaned = normalizeHeadlines(headlines);
  if (cleaned.length === 0) {
    throw new Error("අඩු තරමේ headline එකක් ඕන.");
  }

  try {
    const { doc, setDoc } = await import("firebase/firestore");
    await setDoc(
      doc(db, "settings", SETTINGS_DOC),
      {
        headlines: cleaned,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return cleaned;
  } catch (err) {
    throw new Error(mapFirebaseError(err));
  }
}
