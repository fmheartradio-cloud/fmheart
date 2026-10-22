export type DirectAdBanner = {
  enabled: boolean;
  imageUrl: string;
  href: string;
  alt: string;
};

export type HomeAdSlotId =
  | "player"
  | "header"
  | "inFeed"
  | "sidebar"
  | "footer"
  | "partnerStrip";

export type AdsSettings = {
  banners: Record<HomeAdSlotId, DirectAdBanner>;
};

export function emptyBanner(): DirectAdBanner {
  return { enabled: false, imageUrl: "", href: "", alt: "" };
}

export function isLiveBanner(
  banner?: DirectAdBanner | null,
): banner is DirectAdBanner {
  return Boolean(banner?.enabled && banner.imageUrl.trim());
}
