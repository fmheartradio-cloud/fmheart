import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import {
  djPasswordIsConfigured,
  saveDjPortalPassword,
} from "@/services/dj-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const configured = await djPasswordIsConfigured();
  return NextResponse.json({
    configured,
    envConfigured: Boolean(process.env.DJ_PASSWORD?.trim()),
  });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  let body: { password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    await saveDjPortalPassword(body.password || "");
    return NextResponse.json({ ok: true, configured: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
