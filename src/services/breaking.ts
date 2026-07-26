import { breakingHeadlines as mockHeadlines } from "@/data/mock";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { mapFirebaseError } from "@/services/articles";

const SETTINGS_DOC = "breaking";

async function tryFirestore() {
  if (!isFirebaseConfigured()) return null;
  const { getDb } = await import("@/lib/firebase/client");
  return getDb();
}

function normalizeHeadlines(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

/** Public read — used by TopBar ticker */
export async function getBreakingHeadlines(): Promise<string[]> {
  try {
    const db = await tryFirestore();
    if (!db) return mockHeadlines;

    const { doc, getDoc } = await import("firebase/firestore");
    const snap = await getDoc(doc(db, "settings", SETTINGS_DOC));
    if (!snap.exists()) return mockHeadlines;

    const headlines = normalizeHeadlines(snap.data()?.headlines);
    return headlines.length > 0 ? headlines : mockHeadlines;
  } catch (err) {
    console.warn("[breaking] read failed:", err);
    return mockHeadlines;
  }
}

/** Admin write — requires signed-in admin */
export async function saveBreakingHeadlines(
  headlines: string[],
): Promise<string[]> {
  const db = await tryFirestore();
  if (!db) {
    throw new Error(
      "Firebase configured නැහැ. .env.local එකේ Firebase keys දාන්න.",
    );
  }

  const cleaned = normalizeHeadlines(headlines);
  if (cleaned.length === 0) {
    throw new Error("අඩු තරමේ headline එකක් ඕන.");
  }

  try {
    const { doc, setDoc } = await import("firebase/firestore");
    await setDoc(
      doc(db, "settings", SETTINGS_DOC),
      {
        headlines: cleaned,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return cleaned;
  } catch (err) {
    throw new Error(mapFirebaseError(err));
  }
}
