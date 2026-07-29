import { SITE } from "@/lib/site";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type FacebookPostInput = {
  title: string;
  excerpt?: string;
  slug: string;
  type?: "news" | "gossip";
  category?: string;
  breaking?: boolean;
  coverImage?: string;
};

export type FacebookPostResult = {
  ok: true;
  postId: string;
  postUrl: string;
};

export type FacebookPostError = {
  ok: false;
  error: string;
};

export function isFacebookAutoPostConfigured(): boolean {
  if (process.env.FACEBOOK_AUTO_POST === "false") return false;
  return Boolean(
    process.env.FACEBOOK_PAGE_ID?.trim() &&
      process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim(),
  );
}

export function articlePublicUrl(input: {
  slug: string;
  type?: "news" | "gossip";
}): string {
  const base = SITE.url.replace(/\/$/, "");
  const path =
    input.type === "gossip"
      ? `/gossip/${encodeURIComponent(input.slug)}`
      : `/news/${encodeURIComponent(input.slug)}`;
  return `${base}${path}`;
}

export function buildFacebookMessage(input: FacebookPostInput): string {
  const url = articlePublicUrl(input);
  const title = input.title.trim().slice(0, 180);

  const lines: string[] = [];
  if (input.breaking) lines.push("🚨 BREAKING NEWS", "");
  lines.push(title);
  lines.push("", "👉 වැඩි විස්තර:", url, "", "#FMHeart #SriLanka");
  return lines.join("\n");
}

async function graphPost(
  path: string,
  token: string,
  fields: Record<string, string>,
): Promise<FacebookPostResult | FacebookPostError> {
  const body = new URLSearchParams({
    ...fields,
    access_token: token,
  });

  try {
    const res = await fetch(`${GRAPH_BASE}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });

    const data = (await res.json()) as {
      id?: string;
      post_id?: string;
      error?: { message?: string; type?: string; code?: number };
    };

    if (!res.ok || !data.id) {
      return {
        ok: false,
        error:
          data.error?.message ||
          `Facebook Graph API error (HTTP ${res.status})`,
      };
    }

    const postId = data.post_id || data.id;
    return {
      ok: true,
      postId,
      postUrl: `https://www.facebook.com/${postId}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function absoluteCoverUrl(coverImage?: string): string | null {
  const raw = (coverImage || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) {
    return `${SITE.url.replace(/\/$/, "")}${raw}`;
  }
  return null;
}

/** Publish a Page post with cover photo when possible. */
export async function postArticleToFacebookPage(
  input: FacebookPostInput,
): Promise<FacebookPostResult | FacebookPostError> {
  const pageId = process.env.FACEBOOK_PAGE_ID?.trim();
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim();

  if (!pageId || !token) {
    return {
      ok: false,
      error: "Facebook env vars missing (FACEBOOK_PAGE_ID / FACEBOOK_PAGE_ACCESS_TOKEN)",
    };
  }

  const message = buildFacebookMessage(input);
  const coverUrl = absoluteCoverUrl(input.coverImage);

  // Prefer photo post so the cover image appears on the Page
  if (coverUrl) {
    const photo = await graphPost(`${encodeURIComponent(pageId)}/photos`, token, {
      url: coverUrl,
      caption: message,
      published: "true",
    });
    if (photo.ok) return photo;
    // Fall through to text post if Facebook can't fetch the image URL
    console.warn("[facebook] photo post failed, falling back to text:", photo.error);
  }

  // Text-only fallback (no Graph `link=` scrape — that triggers reduce-data errors)
  const full = await graphPost(`${encodeURIComponent(pageId)}/feed`, token, {
    message,
  });
  if (full.ok) return full;

  const reduce =
    /reduce the amount of data|too much data|request entity too large/i.test(
      full.error,
    );
  if (!reduce) return full;

  const url = articlePublicUrl(input);
  const shortTitle = input.title.trim().slice(0, 120);
  return graphPost(`${encodeURIComponent(pageId)}/feed`, token, {
    message: `${shortTitle}\n\n${url}\n\n#FMHeart`,
  });
}

export function isNewsbotFacebookAutoPostEnabled(): boolean {
  if (process.env.FACEBOOK_NEWSBOT_AUTO_POST === "false") return false;
  if (process.env.FACEBOOK_NEWSBOT_AUTO_POST === "true") {
    return isFacebookAutoPostConfigured();
  }
  // Default: follow main Facebook auto-post config
  return isFacebookAutoPostConfigured();
}

export function newsbotFacebookMaxPerRun(): number {
  const raw = Number(process.env.FACEBOOK_NEWSBOT_MAX_PER_RUN || "5");
  if (!Number.isFinite(raw) || raw < 0) return 5;
  return Math.min(Math.floor(raw), 20);
}

type ArticleFacebookFields = {
  title?: unknown;
  excerpt?: unknown;
  slug?: unknown;
  type?: unknown;
  category?: unknown;
  breaking?: unknown;
  status?: unknown;
  coverImage?: unknown;
  facebookPostId?: unknown;
};

/** Post a Firestore article to Facebook and save post id on the doc. */
export async function postFirestoreArticleToFacebook(options: {
  articleId: string;
  data: ArticleFacebookFields;
  update: (fields: Record<string, unknown>) => Promise<void>;
  force?: boolean;
}): Promise<FacebookPostResult | FacebookPostError | { ok: true; skipped: true; reason: string }> {
  if (!isFacebookAutoPostConfigured()) {
    return { ok: false, error: "Facebook auto-post not configured" };
  }

  const status = String(options.data.status || "");
  if (status && status !== "published") {
    return { ok: true, skipped: true, reason: "not_published" };
  }

  const existingId = String(options.data.facebookPostId || "").trim();
  if (existingId && !options.force) {
    return { ok: true, skipped: true, reason: "already_posted" };
  }

  const title = String(options.data.title || "").trim();
  const slug = String(options.data.slug || "").trim();
  if (!title || !slug) {
    return { ok: false, error: "Article missing title/slug" };
  }

  const result = await postArticleToFacebookPage({
    title,
    excerpt: String(options.data.excerpt || ""),
    slug,
    type: options.data.type === "gossip" ? "gossip" : "news",
    category: String(options.data.category || ""),
    breaking: Boolean(options.data.breaking),
    coverImage: String(options.data.coverImage || ""),
  });

  if (!result.ok) {
    await options.update({
      facebookPostError: result.error,
      facebookPostedAt: null,
      updatedAt: new Date().toISOString(),
    });
    return result;
  }

  const nowIso = new Date().toISOString();
  await options.update({
    facebookPostId: result.postId,
    facebookPostUrl: result.postUrl,
    facebookPostedAt: nowIso,
    facebookPostError: null,
    updatedAt: nowIso,
  });

  return result;
}

