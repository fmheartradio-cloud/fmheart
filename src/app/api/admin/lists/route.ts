import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import {
  deleteCmsItem,
  isListKey,
  listCmsItems,
  saveCmsItem,
} from "@/services/lists";
import { appendActivityLog } from "@/services/station";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!isListKey(key)) {
    return NextResponse.json({ error: "Unknown list" }, { status: 400 });
  }
  try {
    return NextResponse.json({ items: await listCmsItems(key) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  let body: { key?: string; id?: string; item?: Record<string, string> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.key || !isListKey(body.key) || !body.item) {
    return NextResponse.json({ error: "Invalid list payload" }, { status: 400 });
  }
  try {
    const item = await saveCmsItem(body.key, body.item, body.id);
    await appendActivityLog({
      actor: auth.email,
      action: `Saved ${body.key}`,
      detail: item.title || item.id,
    });
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  let body: { key?: string; id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.key || !isListKey(body.key) || !body.id) {
    return NextResponse.json({ error: "Invalid delete payload" }, { status: 400 });
  }
  try {
    await deleteCmsItem(body.key, body.id);
    await appendActivityLog({
      actor: auth.email,
      action: `Deleted ${body.key}`,
      detail: body.id,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
