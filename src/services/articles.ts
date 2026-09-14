import type { CmsArticle, CmsArticleInput } from "@/types/cms";
import { gossipNews, latestNews } from "@/data/mock";
import { cmsFetch } from "@/lib/cms-fetch";
import { formatSriLankaDateTime } from "@/lib/datetime";
import { getAdminDb, isDbConfigured } from "@/lib/db/compat";
import { finalizeCoverUrl } from "@/lib/image-url";
import { toPlainExcerpt, toPlainText } from "@/lib/plain-text";
import { hasSinhalaNewsText } from "@/lib/sinhala-script";

function slugify(text: string): string {
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

export function mapFirebaseError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/turso|libsql|database/i.test(message)) {
    return message;
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

function filterPublicNews(items: CmsArticle[], status: string): CmsArticle[] {
  if (status === "all") return items;
  return items.filter((a) => {
    if (a.type !== "news") return true;
    if (!hasSinhalaNewsText(a.title, a.excerpt)) return false;
    const cover = finalizeCoverUrl(a.coverImage || "");
    return Boolean(cover);
  });
}

function docToArticle(id: string, data: Record<string, unknown>): CmsArticle {
  return normalizeArticleText({
    id,
    type: data.type === "gossip" ? "gossip" : "news",
    title: String(data.title || ""),
    slug: String(data.slug || ""),
    excerpt: String(data.excerpt || ""),
    body: String(data.body || ""),
    category: String(data.category || ""),
    coverImage: String(data.coverImage || ""),
    author: String(data.author || ""),
    status:
      data.status === "draft" || data.status === "archived"
        ? data.status
        : "published",
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    readingTimeMin: Number(data.readingTimeMin) || 1,
    views: Number(data.views) || 0,
    createdAt: String(data.createdAt || ""),
    updatedAt: String(data.updatedAt || ""),
    publishedAt: data.publishedAt ? String(data.publishedAt) : null,
    seoTitle: data.seoTitle ? String(data.seoTitle) : undefined,
    seoDescription: data.seoDescription
      ? String(data.seoDescription)
      : undefined,
    source: data.source ? String(data.source) : undefined,
    sourceUrl: data.sourceUrl ? String(data.sourceUrl) : undefined,
    sourceHash: data.sourceHash ? String(data.sourceHash) : undefined,
    ingestedBy: data.ingestedBy === "newsbot" ? "newsbot" : "manual",
    facebookPostId: data.facebookPostId
      ? String(data.facebookPostId)
      : undefined,
    facebookPostUrl: data.facebookPostUrl
      ? String(data.facebookPostUrl)
      : undefined,
    facebookPostedAt: data.facebookPostedAt
      ? String(data.facebookPostedAt)
      : undefined,
    facebookPostError: data.facebookPostError
      ? String(data.facebookPostError)
      : undefined,
  } as CmsArticle);
}

async function listArticlesDb(options?: {
  type?: "news" | "gossip";
  status?: "published" | "draft" | "archived" | "all";
  limit?: number;
}): Promise<CmsArticle[]> {
  const type = options?.type;
  const status = options?.status ?? "published";
  const limitCount = options?.limit ?? 24;
  const configured = isDbConfigured();

  try {
    const db = getAdminDb();
    if (db) {
      const snap =
        status === "all"
          ? await db.collection("articles").get()
          : await db
              .collection("articles")
              .where("status", "==", status)
              .get();

      let items = snap.docs.map((d) => docToArticle(d.id, d.data()));
      if (type) items = items.filter((a) => a.type === type);
      items = filterPublicNews(items, status);
      return sortByPublished(items).slice(0, limitCount);
    }
  } catch (err) {
    console.warn("[articles] Turso read failed:", err);
    if (configured) return [];
  }

  if (configured || process.env.NODE_ENV === "production") return [];

  let items = mockToCms();
  if (type) items = items.filter((a) => a.type === type);
  if (status !== "all") items = items.filter((a) => a.status === status);
  items = filterPublicNews(items, status);
  return sortByPublished(items).slice(0, limitCount);
}

export async function listArticles(options?: {
  type?: "news" | "gossip";
  status?: "published" | "draft" | "archived" | "all";
  limit?: number;
}): Promise<CmsArticle[]> {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams();
    if (options?.type) params.set("type", options.type);
    if (options?.status) params.set("status", options.status);
    if (options?.limit) params.set("limit", String(options.limit));
    const data = await cmsFetch<{ articles: CmsArticle[] }>(
      `/api/admin/articles?${params.toString()}`,
    );
    return data.articles || [];
  }
  return listArticlesDb(options);
}

export async function getArticleBySlug(
  rawSlug: string,
): Promise<CmsArticle | null> {
  const configured = isDbConfigured();
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
    const db = getAdminDb();
    if (db) {
      for (const candidate of slugVariants) {
        const snap = await db
          .collection("articles")
          .where("status", "==", "published")
          .where("slug", "==", candidate)
          .limit(1)
          .get();
        if (!snap.empty) {
          const d = snap.docs[0]!;
          const article = docToArticle(d.id, d.data());
          if (
            article.type === "news" &&
            !hasSinhalaNewsText(article.title, article.excerpt)
          ) {
            return null;
          }
          return article;
        }
      }

      const published = await listArticlesDb({
        status: "published",
        limit: 100,
      });
      const match = published.find((a) => {
        const title = (a.title || "").trim().replace(/[.\s]+$/g, "");
        return slugVariants.some(
          (v) =>
            a.slug === v ||
            a.slug.replace(/\s+/g, "-") === v.replace(/\s+/g, "-") ||
            title === v ||
            title === v.replace(/[.\s]+$/g, "") ||
            (v.length > 20 &&
              (v.startsWith(title) || title.startsWith(v.slice(0, 40)))),
        );
      });
      return match ?? null;
    }
  } catch (err) {
    console.warn("[articles] getBySlug failed:", err);
    if (configured) return null;
  }

  if (configured || process.env.NODE_ENV === "production") return null;
  return mockToCms().find((a) => a.slug === slug) ?? null;
}

export async function saveArticle(
  input: CmsArticleInput,
  id?: string,
): Promise<CmsArticle> {
  if (typeof window !== "undefined") {
    const data = await cmsFetch<{ article: CmsArticle }>("/api/admin/articles", {
      method: "POST",
      body: JSON.stringify({ input, id }),
    });
    return data.article;
  }

  const db = getAdminDb();
  if (!db) {
    throw new Error(
      "Turso configured නැහැ. TURSO_DATABASE_URL සහ TURSO_AUTH_TOKEN දාන්න.",
    );
  }

  const nowIso = new Date().toISOString();
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
      await db.collection("articles").doc(id).set(payload, { merge: true });
      return { id, views: 0, createdAt: nowIso, ...payload } as CmsArticle;
    }

    const ref = await db.collection("articles").add({
      ...payload,
      views: 0,
      createdAt: nowIso,
    });

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
  if (typeof window !== "undefined") {
    await cmsFetch(`/api/admin/articles/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return;
  }

  const db = getAdminDb();
  if (!db) throw new Error("Turso configured නැහැ.");
  const nowIso = new Date().toISOString();
  try {
    await db.collection("articles").doc(id).update({
      status,
      updatedAt: nowIso,
      ...(status === "published" ? { publishedAt: nowIso } : {}),
    });
  } catch (err) {
    throw new Error(mapFirebaseError(err));
  }
}

export async function deleteArticle(id: string): Promise<void> {
  if (typeof window !== "undefined") {
    await cmsFetch(`/api/admin/articles/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return;
  }

  const db = getAdminDb();
  if (!db) throw new Error("Turso configured නැහැ.");

  const { sourceUrlKey } = await import("@/lib/newsbot/blocklist");
  try {
    const snap = await db.collection("articles").doc(id).get();
    if (snap.exists) {
      const data = snap.data();
      const sourceUrl = String(data.sourceUrl || "").trim();
      if (sourceUrl) {
        await db
          .collection("newsbot_blocked")
          .doc(sourceUrlKey(sourceUrl))
          .set(
            {
              sourceUrl,
              sourceHash: data.sourceHash || null,
              title: data.title || "",
              reason: "admin_delete",
              blockedAt: new Date().toISOString(),
            },
            { merge: true },
          );
      }
    }
    await db.collection("articles").doc(id).delete();
  } catch (err) {
    throw new Error(mapFirebaseError(err));
  }
}

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
  const res = await fetch("/api/admin/facebook/post", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
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

export async function incrementArticleViews(id: string): Promise<void> {
  if (!id) return;
  if (typeof window !== "undefined") {
    const key = `fh-view-${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    try {
      await fetch("/api/news/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.warn("[articles] view increment failed:", err);
    }
    return;
  }

  if (!isDbConfigured()) return;
  try {
    const db = getAdminDb();
    if (!db) return;
    const snap = await db.collection("articles").doc(id).get();
    if (!snap.exists) return;
    const views = Number(snap.data().views || 0) + 1;
    await db.collection("articles").doc(id).update({ views });
  } catch (err) {
    console.warn("[articles] view increment failed:", err);
  }
}

export { slugify, listArticlesDb };
