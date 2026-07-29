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
