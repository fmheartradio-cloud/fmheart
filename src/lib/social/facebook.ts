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
  const excerpt = (input.excerpt || "").trim();
  const lines: string[] = [];

  if (input.breaking) {
    lines.push("🚨 BREAKING NEWS", "");
  }

  lines.push(input.title.trim());

  if (excerpt) {
    lines.push("", excerpt.slice(0, 280));
  }

  lines.push("", "👉 වැඩි විස්තර:", url);

  const tags = ["#FMHeart", "#SriLanka"];
  if (input.category?.includes("ක්‍රීඩා") || /sport/i.test(input.category || "")) {
    tags.push("#Sports");
  }
  lines.push("", tags.join(" "));

  return lines.join("\n");
}

/** Publish a link post to the connected Facebook Page. */
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
  const link = articlePublicUrl(input);

  const body = new URLSearchParams({
    message,
    link,
    access_token: token,
  });

  try {
    const res = await fetch(`${GRAPH_BASE}/${encodeURIComponent(pageId)}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });

    const data = (await res.json()) as {
      id?: string;
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

    return {
      ok: true,
      postId: data.id,
      postUrl: `https://www.facebook.com/${data.id}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
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

