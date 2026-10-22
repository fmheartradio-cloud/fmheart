import { cmsFetch } from "@/lib/cms-fetch";
import { getAdminDb } from "@/lib/db/compat";

export const LIST_KEYS = [
  "schedule",
  "music",
  "djs",
  "pages",
  "comments",
] as const;

export type ListKey = (typeof LIST_KEYS)[number];

export type CmsListItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: string;
};

function isListKey(value: string): value is ListKey {
  return (LIST_KEYS as readonly string[]).includes(value);
}

function asItem(id: string, raw: Record<string, unknown>): CmsListItem {
  const now = new Date().toISOString();
  const item: CmsListItem = {
    id,
    title: typeof raw.title === "string" ? raw.title : "",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
  };
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") item[k] = v;
  }
  item.id = id;
  return item;
}

export async function listCmsItems(key: ListKey): Promise<CmsListItem[]> {
  if (typeof window !== "undefined") {
    const data = await cmsFetch<{ items: CmsListItem[] }>(
      `/api/admin/lists?key=${key}`,
    );
    return data.items || [];
  }
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(key)
    .orderBy("updatedAt", "desc")
    .limit(200)
    .get();
  return snap.docs.map((d) => asItem(d.id, d.data()));
}

export async function saveCmsItem(
  key: ListKey,
  input: Record<string, string>,
  id?: string,
): Promise<CmsListItem> {
  if (typeof window !== "undefined") {
    const data = await cmsFetch<{ item: CmsListItem }>("/api/admin/lists", {
      method: "PUT",
      body: JSON.stringify({ key, id, item: input }),
    });
    return data.item;
  }
  const db = getAdminDb();
  if (!db) throw new Error("Turso configured නැහැ.");
  const now = new Date().toISOString();
  const nextId =
    id?.trim() || `id-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const current = id
    ? await db.collection(key).doc(nextId).get()
    : null;
  const prev: Record<string, unknown> =
    current && current.exists ? current.data() : {};
  const item = asItem(nextId, {
    ...prev,
    ...input,
    createdAt:
      typeof prev.createdAt === "string" ? prev.createdAt : now,
    updatedAt: now,
  });
  await db.collection(key).doc(nextId).set({ ...item });
  return item;
}

export async function deleteCmsItem(key: ListKey, id: string): Promise<void> {
  if (typeof window !== "undefined") {
    await cmsFetch("/api/admin/lists", {
      method: "DELETE",
      body: JSON.stringify({ key, id }),
    });
    return;
  }
  const db = getAdminDb();
  if (!db) throw new Error("Turso configured නැහැ.");
  await db.collection(key).doc(id).delete();
}

export { isListKey };
