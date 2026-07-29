import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { getAdminDb } from "@/lib/firebase/admin";
import { sourceUrlKey } from "@/lib/newsbot/blocklist";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function verifyFirebaseIdToken(
  token: string,
): Promise<{ email?: string } | null> {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) return null;

  // Avoid firebase-admin/auth (jose ESM break on Vercel). Use Google tokeninfo.
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    email?: string;
    aud?: string;
    exp?: string;
  };
  if (data.aud !== projectId) return null;
  if (data.exp && Number(data.exp) * 1000 < Date.now()) return null;
  return { email: data.email };
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing article id" }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Admin SDK not configured" },
      { status: 503 },
    );
  }

  try {
    const decoded = await verifyFirebaseIdToken(token);
    if (!decoded || !isAdminEmail(decoded.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ref = db.collection("articles").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ ok: true, missing: true });
    }

    const data = snap.data() || {};
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

    await ref.delete();
    return NextResponse.json({ ok: true, blocked: Boolean(sourceUrl) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
