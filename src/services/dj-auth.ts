import { getAdminDb } from "@/lib/db/compat";
import { hashPassword, timingSafeTextEqual, verifyPassword } from "@/lib/password";
import { listCmsItems } from "@/services/lists";

const SETTINGS_DOC = "dj-auth";

type DjAuthDoc = {
  passwordHash?: string;
  updatedAt?: string;
};

async function readDjAuth(): Promise<DjAuthDoc | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection("settings").doc(SETTINGS_DOC).get();
  if (!snap.exists) return null;
  const data = snap.data() as DjAuthDoc;
  return data;
}

export async function djPasswordIsConfigured(): Promise<boolean> {
  if (process.env.DJ_PASSWORD?.trim()) return true;
  const stored = await readDjAuth();
  return Boolean(stored?.passwordHash);
}

export async function djPasswordMatches(password: string): Promise<boolean> {
  if (!password) return false;
  const envPassword = process.env.DJ_PASSWORD?.trim() || "";
  if (envPassword && timingSafeTextEqual(password, envPassword)) return true;
  const stored = await readDjAuth();
  if (stored?.passwordHash) return verifyPassword(password, stored.passwordHash);
  return false;
}

export async function saveDjPortalPassword(password: string): Promise<void> {
  const db = getAdminDb();
  if (!db) {
    throw new Error(
      "Turso configured නැහැ. TURSO_DATABASE_URL සහ TURSO_AUTH_TOKEN දාන්න.",
    );
  }
  const trimmed = password.trim();
  if (trimmed.length < 8) {
    throw new Error("DJ password අවම වශයෙන් අකුරු 8ක් ඕන.");
  }
  await db.collection("settings").doc(SETTINGS_DOC).set(
    {
      passwordHash: hashPassword(trimmed),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function findDjByEmail(email: string) {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;
  const djs = await listCmsItems("djs");
  return (
    djs.find((dj) => (dj.email || "").trim().toLowerCase() === needle) || null
  );
}
