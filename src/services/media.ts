import { getAdminDb } from "@/lib/db/compat";
import sharp from "sharp";

const COL = "media";
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type StoredMedia = {
  mime: string;
  filename: string;
  data: string;
  createdAt: string;
  kind: string;
};

export async function saveImageUpload(
  file: File,
  kind = "ad",
): Promise<{ id: string; url: string }> {
  const namedOk = /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name || "");
  const typeOk =
    !file.type ||
    ALLOWED.has(file.type) ||
    file.type.startsWith("image/");
  if (!typeOk && !namedOk) {
    throw new Error("JPG, PNG, WebP හෝ GIF විතරක් upload කරන්න.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image එක 4MB ට වඩා ලොකුයි. Compress කරලා නැවත try කරන්න.");
  }

  const db = getAdminDb();
  if (!db) {
    throw new Error("Turso configured නැහැ.");
  }

  const input = Buffer.from(await file.arrayBuffer());
  let mime = "image/jpeg";
  let data: Buffer;

  try {
    data = await sharp(input)
      .rotate()
      .resize({
        width: 1600,
        height: 900,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new Error("Image එක කියවන්න බැරි වුණා. වෙන file එකක් try කරන්න.");
  }

  const id = `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const payload: StoredMedia = {
    mime,
    filename: file.name || `${id}.jpg`,
    data: data.toString("base64"),
    createdAt: new Date().toISOString(),
    kind,
  };
  await db.collection(COL).doc(id).set({ ...payload });
  return { id, url: `/api/media/${id}` };
}

export async function getStoredMedia(id: string): Promise<StoredMedia | null> {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return null;
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(COL).doc(id).get();
  if (!snap.exists) return null;
  const raw = snap.data();
  if (typeof raw.data !== "string" || typeof raw.mime !== "string") return null;
  return {
    mime: raw.mime,
    filename: typeof raw.filename === "string" ? raw.filename : id,
    data: raw.data,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
    kind: typeof raw.kind === "string" ? raw.kind : "ad",
  };
}
