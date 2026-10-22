import { HOME_AD_SLOTS } from "@/lib/ad-placements";
import { cmsFetch } from "@/lib/cms-fetch";
import { getAdminDb } from "@/lib/db/compat";
import {
  emptyBanner,
  type AdsSettings,
  type DirectAdBanner,
  type HomeAdSlotId,
} from "@/types/ads";

const SETTINGS_DOC = "ads";

export type { AdsSettings, DirectAdBanner, HomeAdSlotId };

export function emptyAdsSettings(): AdsSettings {
  return {
    banners: Object.fromEntries(
      HOME_AD_SLOTS.map((slot) => [slot.id, emptyBanner()]),
    ) as AdsSettings["banners"],
  };
}

function asBanner(raw: unknown): DirectAdBanner {
  if (!raw || typeof raw !== "object") return emptyBanner();
  const row = raw as Record<string, unknown>;
  return {
    enabled: Boolean(row.enabled),
    imageUrl: typeof row.imageUrl === "string" ? row.imageUrl.trim() : "",
    href: typeof row.href === "string" ? row.href.trim() : "",
    alt: typeof row.alt === "string" ? row.alt.trim() : "",
  };
}

export function normalizeAds(raw: unknown): AdsSettings {
  const next = emptyAdsSettings();
  const source =
    raw && typeof raw === "object" && "banners" in raw
      ? (raw as { banners: unknown }).banners
      : raw;
  if (!source || typeof source !== "object") return next;
  const map = source as Record<string, unknown>;
  for (const slot of HOME_AD_SLOTS) {
    next.banners[slot.id] = asBanner(map[slot.id]);
  }
  return next;
}

async function readAds(): Promise<AdsSettings | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection("settings").doc(SETTINGS_DOC).get();
  if (!snap.exists) return emptyAdsSettings();
  return normalizeAds(snap.data());
}

export async function getPublicAds(): Promise<AdsSettings> {
  try {
    return (await readAds()) || emptyAdsSettings();
  } catch (err) {
    console.warn("[ads] public read failed:", err);
    return emptyAdsSettings();
  }
}

export async function getCmsAds(): Promise<AdsSettings> {
  if (typeof window !== "undefined") {
    const data = await cmsFetch<{ banners: AdsSettings["banners"] }>(
      "/api/admin/settings?key=ads",
    );
    return normalizeAds(data);
  }
  try {
    return (await readAds()) || emptyAdsSettings();
  } catch (err) {
    console.warn("[ads] CMS read failed:", err);
    return emptyAdsSettings();
  }
}

export async function saveAds(input: AdsSettings): Promise<AdsSettings> {
  if (typeof window !== "undefined") {
    const data = await cmsFetch<{ banners: AdsSettings["banners"] }>(
      "/api/admin/settings",
      {
        method: "PUT",
        body: JSON.stringify({ key: "ads", banners: input.banners }),
      },
    );
    return normalizeAds(data);
  }

  const db = getAdminDb();
  if (!db) {
    throw new Error(
      "Turso configured නැහැ. TURSO_DATABASE_URL සහ TURSO_AUTH_TOKEN දාන්න.",
    );
  }

  const cleaned = normalizeAds(input);
  for (const slot of HOME_AD_SLOTS) {
    const banner = cleaned.banners[slot.id];
    if (banner.enabled && banner.imageUrl && !banner.href) {
      banner.href = "/promotion";
    }
  }

  await db.collection("settings").doc(SETTINGS_DOC).set(
    {
      banners: cleaned.banners,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
  return cleaned;
}
