import type { CmsArticle, CmsArticleInput } from "@/types/cms";
import { gossipNews, latestNews } from "@/data/mock";
import { formatSriLankaDateTime } from "@/lib/datetime";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { finalizeCoverUrl, upgradeImageUrl } from "@/lib/image-url";
import { toPlainExcerpt, toPlainText } from "@/lib/plain-text";
import { hasSinhalaNewsText } from "@/lib/sinhala-script";

function slugify(text: string): string {
  // Prefer short ASCII slugs. Pure-Sinhala titles → news-{id}
  const ascii = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const suffix = Date.now().toString(36);
  if (ascii.length >= 3) return `${ascii}-${suffix}`;
  return `news-${suffix}`;
}

function normalizeSlugParam(raw: string): string {
  try {
    return decodeURIComponent(raw)
      .trim()
      .replace(/[.\s]+$/g, "")
      .replace(/\s+/g, " ");
  } catch {
    return raw.trim().replace(/[.\s]+$/g, "");
  }
}

function readingTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function normalizeArticleText(article: CmsArticle): CmsArticle {
  const body = toPlainText(article.body);
  const excerpt =
    toPlainExcerpt(article.excerpt, body, 400) ||
    toPlainExcerpt(article.title, body, 400);
  return {
    ...article,
    title: toPlainText(article.title),
    excerpt,
    body,
    coverImage: finalizeCoverUrl(article.coverImage || ""),
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `${label} timeout (${ms / 1000}s). Firestore Database / rules check කරන්න.`,
        ),
      );
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function mapFirebaseError(err: unknown): string {
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code: string }).code)
      : "";
  const message = err instanceof Error ? err.message : String(err);

  if (message.includes("timeout") || message.includes("Firestore")) {
    return message;
  }
  if (code === "permission-denied" || message.includes("permission")) {
    return "Permission denied — Firebase Console → Firestore → Rules එකට අපේ rules paste කරලා Publish කරන්න.";
  }
  if (code === "unavailable" || code === "failed-precondition") {
    return "Firestore ලබාගත නොහැක. Console එකේ database ready ද බලන්න.";
  }
  if (code === "not-found") {
    return "Firestore database හමු නොවුණා.";
  }
  return message || "Save failed";
}

function mockToCms(): CmsArticle[] {
  const now = new Date().toISOString();
  const news = latestNews.map((a, i) => ({
    id: a.id,
    type: "news" as const,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt ?? a.title,
    body: `${a.title}\n\nමෙය demo content එකකි.`,
    category: a.category,
    coverImage: a.image,
    author: "FM Heart Desk",
    status: "published" as const,
    tags: [a.category],
    readingTimeMin: 2,
    views: 1200 - i * 100,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  }));

  const gossip = gossipNews.map((a, i) => ({
    id: a.id,
    type: "gossip" as const,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt ?? a.title,
    body: `${a.title}\n\nGossip demo content.`,
    category: a.category,
    coverImage: a.image,
    author: "Entertainment Desk",
    status: "published" as const,
    tags: [a.category, "gossip"],
    readingTimeMin: 2,
    views: 900 - i * 80,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  }));

  return [...news, ...gossip];
}

function sortByPublished(items: CmsArticle[]): CmsArticle[] {
  return [...items].sort((a, b) => {
    const ta =
      Date.parse(a.publishedAt || a.createdAt || a.updatedAt || "") || 0;
    const tb =
      Date.parse(b.publishedAt || b.createdAt || b.updatedAt || "") || 0;
    return tb - ta;
  });
}

/** Hide non-Sinhala news and cover-less / junk-cover news on the public site. */
function filterPublicNews(items: CmsArticle[], status: string): CmsArticle[] {
  if (status === "all") return items;
  return items.filter((a) => {
    if (a.type !== "news") return true;
    if (!hasSinhalaNewsText(a.title, a.excerpt)) return false;
    const cover = finalizeCoverUrl(a.coverImage || "");
    return Boolean(cover);
  });
}

async function tryFirestore() {
  if (!isFirebaseConfigured()) return null;
  const { getDb } = await import("@/lib/firebase/client");
  return getDb();
}

export async function listArticles(options?: {
  type?: "news" | "gossip";
  status?: "published" | "draft" | "archived" | "all";
  limit?: number;
}): Promise<CmsArticle[]> {
  const type = options?.type;
  const status = options?.status ?? "published";
  const limitCount = options?.limit ?? 24;
  const configured = isFirebaseConfigured();

  try {
    const db = await tryFirestore();
    if (db) {
      const { collection, getDocs, query, where } = await import(
        "firebase/firestore"
      );

      // Public/SSR reads MUST filter by status==published (Firestore rules).
      // Admin "all" works only when authenticated as admin (browser CMS).
      let snap;
      if (status === "all") {
        snap = await withTimeout(
          getDocs(collection(db, "articles")),
          15000,
          "Firestore read",
        );
      } else {
        snap = await withTimeout(
          getDocs(
            query(
              collection(db, "articles"),
              where("status", "==", status),
            ),
          ),
          15000,
          "Firestore read",
        );
      }

      let items = snap.docs.map(
        (d) => normalizeArticleText({ id: d.id, ...d.data() } as CmsArticle),
      );
      if (type) items = items.filter((a) => a.type === type);
      items = filterPublicNews(items, status);
      return sortByPublished(items).slice(0, limitCount);
    }
  } catch (err) {
    console.warn("[articles] Firestore read failed:", err);
    if (configured) return [];
  }

  if (configured) return [];

  let items = mockToCms();
  if (type) items = items.filter((a) => a.type === type);
  if (status !== "all") items = items.filter((a) => a.status === status);
  items = filterPublicNews(items, status);
  return sortByPublished(items).slice(0, limitCount);
}

export async function getArticleBySlug(rawSlug: string): Promise<CmsArticle | null> {
  const configured = isFirebaseConfigured();
  const slug = normalizeSlugParam(rawSlug);
  const slugVariants = Array.from(
    new Set([
      slug,
      slug.replace(/\s+/g, "-"),
      slug.replace(/\s+/g, ""),
      rawSlug.trim(),
    ]),
  );

  try {
    const db = await tryFirestore();
    if (db) {
      const { collection, getDocs, limit, query, where } = await import(
        "firebase/firestore"
      );

      for (const candidate of slugVariants) {
        const q = query(
          collection(db, "articles"),
          where("status", "==", "published"),
          where("slug", "==", candidate),
          limit(1),
        );
        try {
          const snap = await withTimeout(getDocs(q), 10000, "Firestore read");
          if (!snap.empty) {
            const d = snap.docs[0]!;
            const article = normalizeArticleText({
              id: d.id,
              ...d.data(),
            } as CmsArticle);
            if (
              article.type === "news" &&
              !hasSinhalaNewsText(article.title, article.excerpt)
            ) {
              return null;
            }
            return article;
          }
        } catch {
          // composite index may be missing — fall through to scan
          break;
        }
      }

      const published = await listArticles({ status: "published", limit: 100 });
      const match = published.find((a) => {
          const title = (a.title || "").trim().replace(/[.\s]+$/g, "");
          return slugVariants.some(
            (v) =>
              a.slug === v ||
              a.slug.replace(/\s+/g, "-") === v.replace(/\s+/g, "-") ||
              title === v ||
              title === v.replace(/[.\s]+$/g, "") ||
              // long Sinhala URLs: title is a prefix of the slug param
              (v.length > 20 && (v.startsWith(title) || title.startsWith(v.slice(0, 40)))),
          );
      });
      return match ?? null;
    }
  } catch (err) {
    console.warn("[articles] getBySlug failed:", err);
    if (configured) return null;
  }

  return mockToCms().find((a) => a.slug === slug) ?? null;
}

export async function saveArticle(
  input: CmsArticleInput,
  id?: string,
): Promise<CmsArticle> {
  const db = await tryFirestore();
  if (!db) {
    throw new Error(
      "Firebase configured නැහැ. .env.local එකේ Firebase keys දාන්න.",
    );
  }

  const { collection, doc, setDoc, addDoc } = await import("firebase/firestore");

  const nowIso = new Date().toISOString();
  // Never use raw Sinhala title as URL slug
  const provided = input.slug?.trim();
  const looksLikeTitle =
    !provided ||
    provided.length > 80 ||
    /\s/.test(provided) ||
    /[^\u0000-\u007f]/.test(provided);
  const slug = looksLikeTitle ? slugify(input.title) : provided;
  const payload = {
    type: input.type,
    title: input.title.trim(),
    slug,
    excerpt: input.excerpt.trim(),
    body: input.body.trim(),
    category: input.category.trim(),
    coverImage: input.coverImage.trim(),
    author: input.author.trim() || "FM Heart Desk",
    status: input.status,
    tags: input.tags.filter(Boolean),
    readingTimeMin: readingTime(input.body),
    seoTitle: input.seoTitle?.trim() || input.title.trim(),
    seoDescription: input.seoDescription?.trim() || input.excerpt.trim(),
    updatedAt: nowIso,
    publishedAt: input.status === "published" ? nowIso : null,
    ingestedBy: input.ingestedBy ?? "manual",
    ...(input.source ? { source: input.source.trim() } : {}),
    ...(input.sourceUrl ? { sourceUrl: input.sourceUrl.trim() } : {}),
    ...(input.sourceHash ? { sourceHash: input.sourceHash.trim() } : {}),
  };

  try {
    if (id) {
      const ref = doc(db, "articles", id);
      await withTimeout(
        setDoc(ref, payload, { merge: true }),
        15000,
        "Firestore save",
      );
      return { id, views: 0, createdAt: nowIso, ...payload } as CmsArticle;
    }

    const ref = await withTimeout(
      addDoc(collection(db, "articles"), {
        ...payload,
        views: 0,
        createdAt: nowIso,
      }),
      15000,
      "Firestore save",
    );

    return {
      id: ref.id,
      views: 0,
      createdAt: nowIso,
      ...payload,
    } as CmsArticle;
  } catch (err) {
    throw new Error(mapFirebaseError(err));
  }
}

export async function setArticleStatus(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<void> {
  const db = await tryFirestore();
  if (!db) throw new Error("Firebase configured නැහැ.");
  const { doc, updateDoc } = await import("firebase/firestore");
  const nowIso = new Date().toISOString();
  try {
    await withTimeout(
      updateDoc(doc(db, "articles", id), {
        status,
        updatedAt: nowIso,
        ...(status === "published" ? { publishedAt: nowIso } : {}),
      }),
      12000,
      "Firestore status",
    );
  } catch (err) {
    throw new Error(mapFirebaseError(err));
  }
}

export async function deleteArticle(id: string): Promise<void> {
  const db = await tryFirestore();
  if (!db) throw new Error("Firebase configured නැහැ.");

  // Prefer admin API so newsbot_blocked is written with Admin SDK
  // (client rules may not be deployed yet).
  try {
    const { getFirebaseAuth } = await import("@/lib/firebase/client");
    const auth = getFirebaseAuth();
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) return;
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status !== 503) {
        throw new Error(body.error || `Delete failed (${res.status})`);
      }
    }
  } catch (err) {
    if (
      err instanceof Error &&
      !/Admin SDK not configured|Failed to fetch|503/i.test(err.message)
    ) {
      throw err;
    }
  }

  const { deleteDoc, doc, getDoc, setDoc } = await import("firebase/firestore");
  try {
    const ref = doc(db, "articles", id);
    const snap = await withTimeout(getDoc(ref), 12000, "Firestore get");
    if (snap.exists()) {
      const data = snap.data() as CmsArticle;
      const sourceUrl = String(data.sourceUrl || "").trim();
      if (sourceUrl) {
        const { sourceUrlKeyAsync } = await import("@/lib/newsbot/blocklist");
        const key = await sourceUrlKeyAsync(sourceUrl);
        try {
          await withTimeout(
            setDoc(
              doc(db, "newsbot_blocked", key),
              {
                sourceUrl,
                sourceHash: data.sourceHash || null,
                title: data.title || "",
                reason: "admin_delete",
                blockedAt: new Date().toISOString(),
              },
              { merge: true },
            ),
            12000,
            "Firestore blocklist",
          );
        } catch {
          /* rules may block until published — article delete still proceeds */
        }
      }
    }
    await withTimeout(deleteDoc(ref), 12000, "Firestore delete");
  } catch (err) {
    throw new Error(mapFirebaseError(err));
  }
}

/** Post a published article to the Facebook Page (server Graph API). */
export async function postArticleToFacebook(
  articleId: string,
  options?: { force?: boolean },
): Promise<{
  ok: boolean;
  skipped?: boolean;
  postId?: string;
  postUrl?: string;
  message?: string;
  error?: string;
}> {
  const { getFirebaseAuth } = await import("@/lib/firebase/client");
  const auth = getFirebaseAuth();
  const token = await auth?.currentUser?.getIdToken();
  if (!token) {
    throw new Error("Admin login අවශ්‍යයි (Facebook post).");
  }

  const res = await fetch("/api/admin/facebook/post", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      articleId,
      force: Boolean(options?.force),
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    skipped?: boolean;
    postId?: string;
    postUrl?: string;
    message?: string;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(body.error || `Facebook post failed (${res.status})`);
  }

  return {
    ok: true,
    skipped: body.skipped,
    postId: body.postId,
    postUrl: body.postUrl,
    message: body.message,
  };
}

export function cmsToCard(article: CmsArticle) {
  const path =
    article.type === "gossip"
      ? `/gossip/${encodeURIComponent(article.slug)}`
      : `/news/${encodeURIComponent(article.slug)}`;
  return {
    id: article.id,
    title: article.title,
    excerpt: article.excerpt,
    category: article.category,
    image: article.coverImage || "/logo/fmheart-cover.png",
    publishedAt: article.publishedAt
      ? formatSriLankaDateTime(article.publishedAt)
      : article.status,
    slug: article.slug,
    href: path,
  };
}

/** Public view counter — once per article per browser session */
export async function incrementArticleViews(id: string): Promise<void> {
  if (!id || !isFirebaseConfigured()) return;
  if (typeof window !== "undefined") {
    const key = `fh-view-${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  }

  try {
    const db = await tryFirestore();
    if (!db) return;
    const { doc, increment, updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(db, "articles", id), { views: increment(1) });
  } catch (err) {
    console.warn("[articles] view increment failed:", err);
  }
}

export { slugify };
