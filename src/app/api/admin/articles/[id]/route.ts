import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { deleteArticle, setArticleStatus } from "@/services/articles";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing article id" }, { status: 400 });
  }

  let body: { status?: "draft" | "published" | "archived" };
  try {
    body = (await request.json()) as {
      status?: "draft" | "published" | "archived";
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (
    body.status !== "draft" &&
    body.status !== "published" &&
    body.status !== "archived"
  ) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    await setArticleStatus(id, body.status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing article id" }, { status: 400 });
  }

  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    await deleteArticle(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
