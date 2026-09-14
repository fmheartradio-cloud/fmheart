import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { listArticlesDb, saveArticle } from "@/services/articles";
import type { CmsArticleInput } from "@/types/cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status") || "all";
  const limit = Number(url.searchParams.get("limit") || "200");

  const articles = await listArticlesDb({
    type: type === "gossip" || type === "news" ? type : undefined,
    status:
      status === "draft" ||
      status === "published" ||
      status === "archived" ||
      status === "all"
        ? status
        : "all",
    limit: Number.isFinite(limit) ? limit : 200,
  });

  return NextResponse.json({ articles });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  let body: { input?: CmsArticleInput; id?: string };
  try {
    body = (await request.json()) as { input?: CmsArticleInput; id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.input) {
    return NextResponse.json({ error: "Missing article" }, { status: 400 });
  }

  try {
    const article = await saveArticle(body.input, body.id);
    return NextResponse.json({ article });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
