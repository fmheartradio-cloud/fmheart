import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { getAdminDb } from "@/lib/db/compat";
import {
  isFacebookAutoPostConfigured,
  postArticleToFacebookPage,
} from "@/lib/social/facebook";

export const runtime = "nodejs";

type Body = {
  articleId?: string;
  force?: boolean;
};

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  if (!isFacebookAutoPostConfigured()) {
    return NextResponse.json(
      {
        error:
          "Facebook auto-post not configured. Set FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN (and optional FACEBOOK_AUTO_POST=true).",
      },
      { status: 503 },
    );
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Turso not configured" },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const articleId = body.articleId?.trim();
  if (!articleId) {
    return NextResponse.json({ error: "Missing articleId" }, { status: 400 });
  }

  try {
    const ref = db.collection("articles").doc(articleId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const data = snap.data() || {};
    const status = String(data.status || "");
    if (status !== "published") {
      return NextResponse.json(
        { error: "Only published articles can be posted to Facebook" },
        { status: 400 },
      );
    }

    const existingId = String(data.facebookPostId || "").trim();
    if (existingId && !body.force) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        postId: existingId,
        postUrl: data.facebookPostUrl || `https://www.facebook.com/${existingId}`,
        message: "Already posted to Facebook",
      });
    }

    const title = String(data.title || "").trim();
    const slug = String(data.slug || "").trim();
    if (!title || !slug) {
      return NextResponse.json(
        { error: "Article missing title/slug" },
        { status: 400 },
      );
    }

    const result = await postArticleToFacebookPage({
      title,
      excerpt: String(data.excerpt || ""),
      slug,
      type: data.type === "gossip" ? "gossip" : "news",
      category: String(data.category || ""),
      breaking: Boolean(data.breaking),
      coverImage: String(data.coverImage || ""),
    });

    if (!result.ok) {
      await ref.set(
        {
          facebookPostError: result.error,
          facebookPostedAt: null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    const nowIso = new Date().toISOString();
    await ref.set(
      {
        facebookPostId: result.postId,
        facebookPostUrl: result.postUrl,
        facebookPostedAt: nowIso,
        facebookPostError: null,
        updatedAt: nowIso,
      },
      { merge: true },
    );

    return NextResponse.json({
      ok: true,
      postId: result.postId,
      postUrl: result.postUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
