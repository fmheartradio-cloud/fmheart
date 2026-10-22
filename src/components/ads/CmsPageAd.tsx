import { HomeAdSlot } from "@/components/ads/HomeAdSlot";
import { HOME_AD_SLOT_PIXELS } from "@/lib/ad-placements";
import type { DirectAdBanner, HomeAdSlotId } from "@/types/ads";

const ADSENSE_KIND: Partial<
  Record<HomeAdSlotId, "header" | "sidebar" | "inArticle" | "player">
> = {
  header: "header",
  footer: "header",
  inFeed: "inArticle",
  sidebar: "sidebar",
  player: "player",
};

export function CmsPageAd({
  slotId,
  banner,
  label,
  className = "",
}: {
  slotId: HomeAdSlotId;
  banner?: DirectAdBanner | null;
  label: string;
  className?: string;
}) {
  const px = HOME_AD_SLOT_PIXELS[slotId];
  return (
    <HomeAdSlot
      banner={banner}
      adsenseKind={ADSENSE_KIND[slotId]}
      label={label}
      width={px.width}
      height={px.height}
      fill={px.fill}
      className={className}
      anchorId={`ad-${slotId}`}
    />
  );
}
