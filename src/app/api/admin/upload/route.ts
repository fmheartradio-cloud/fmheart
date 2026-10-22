import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { saveImageUpload } from "@/services/media";
import { appendActivityLog } from "@/services/station";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Image file එකක් තෝරන්න." }, { status: 400 });
    }
    const kind = String(form.get("kind") || "ad");
    const saved = await saveImageUpload(file, kind);
    await appendActivityLog({
      actor: auth.email,
      action: "Uploaded image",
      detail: saved.url,
    });
    return NextResponse.json(saved);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
