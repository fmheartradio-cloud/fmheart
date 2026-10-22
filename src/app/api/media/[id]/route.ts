import { NextResponse } from "next/server";
import { getStoredMedia } from "@/services/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const media = await getStoredMedia(id);
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bytes = Uint8Array.from(Buffer.from(media.data, "base64"));
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": media.mime || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(bytes.length),
    },
  });
}
