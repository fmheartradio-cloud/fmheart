import { cmsFetch } from "@/lib/cms-fetch";
import { getAdminDb } from "@/lib/db/compat";
import { listArticles, mapFirebaseError } from "@/services/articles";
import type { CmsArticle } from "@/types/cms";

const BREAKING_NEWS_LIMIT = 10;
const SETTINGS_DOC = "breaking";

export type BreakingItem = {
  title: string;
  href: string;
};

function normalizeHeadlines(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export function cmsToBreakingItem(article: CmsArticle): BreakingItem {
  return {
    title: article.title,
    href: `/news/${encodeURIComponent(article.slug)}`,
  };
}

export async function getLatestNewsBreakingItems(): Promise<BreakingItem[]> {
  try {
    const articles = await listArticles({
      type: "news",
      status: "published",
      limit: BREAKING_NEWS_LIMIT,
    });
    return articles.map(cmsToBreakingItem);
  } catch (err) {
    console.warn("[breaking] latest news read failed:", err);
    return [];
  }
}

export async function getCmsBreakingHeadlines(): Promise<string[]> {
  if (typeof window !== "undefined") {
    const data = await cmsFetch<{ headlines: string[] }>(
      "/api/admin/settings?key=breaking",
    );
    return data.headlines || [];
  }
  try {
    const db = getAdminDb();
    if (!db) return [];
    const snap = await db.collection("settings").doc(SETTINGS_DOC).get();
    if (!snap.exists) return [];
    return normalizeHeadlines(snap.data()?.headlines);
  } catch (err) {
    console.warn("[breaking] CMS read failed:", err);
    return [];
  }
}

export async function getBreakingHeadlines(): Promise<string[]> {
  const items = await getLatestNewsBreakingItems();
  return items.map((item) => item.title);
}

export async function saveBreakingHeadlines(
  headlines: string[],
): Promise<string[]> {
  if (typeof window !== "undefined") {
    const data = await cmsFetch<{ headlines: string[] }>("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ key: "breaking", headlines }),
    });
    return data.headlines || [];
  }

  const db = getAdminDb();
  if (!db) {
    throw new Error(
      "Turso configured නැහැ. TURSO_DATABASE_URL සහ TURSO_AUTH_TOKEN දාන්න.",
    );
  }

  const cleaned = normalizeHeadlines(headlines);
  if (cleaned.length === 0) {
    throw new Error("අඩු තරමේ headline එකක් ඕන.");
  }

  try {
    await db.collection("settings").doc(SETTINGS_DOC).set(
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
