import { createHash } from "crypto";

/** Stable Firestore doc id for a news source URL (newsbot blocklist). */
export function sourceUrlKey(sourceUrl: string): string {
  return createHash("sha256")
    .update(sourceUrl.trim().toLowerCase())
    .digest("hex")
    .slice(0, 40);
}

/** Browser-safe SHA-256 key — must match `sourceUrlKey`. */
export async function sourceUrlKeyAsync(sourceUrl: string): Promise<string> {
  const normalized = sourceUrl.trim().toLowerCase();
  if (typeof globalThis.crypto?.subtle?.digest === "function") {
    const data = new TextEncoder().encode(normalized);
    const buf = await globalThis.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 40);
  }
  return sourceUrlKey(normalized);
}

export type NewsbotBlockReason =
  | "admin_delete"
  | "no_cover"
  | "video_cover"
  | "watermark";

export type NewsbotBlockRecord = {
  sourceUrl: string;
  sourceHash?: string | null;
  title?: string;
  reason: NewsbotBlockReason;
  blockedAt: string;
};
