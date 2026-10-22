/** Homepage ad inventory — sizes match live layout in `src/app/page.tsx`. */

export const HOME_AD_SLOTS = [
  {
    id: "player",
    name: "Live Player Banner",
    nameSi: "Radio player ඇතුළේ",
    location: "Homepage live radio box එකේ Recently Played තිබුණු තැන",
    iab: "Medium Rectangle",
    widthPx: 300,
    heightPx: 250,
    fill: false,
    sizes: ["300 × 250"],
    minHeight: "250px",
    width: "300px",
    type: "AdSense or direct",
  },
  {
    id: "header",
    name: "Header Banner",
    nameSi: "ප්‍රධාන Banner",
    location: "Hero slider සහ live radio එකට පහළින්, full content width (max-w-7xl)",
    iab: "Full-width banner",
    widthPx: 1280,
    heightPx: 160,
    fill: true,
    sizes: ["1280 × 160"],
    minHeight: "160px",
    width: "100% (max 1280px)",
    type: "AdSense or direct",
  },
  {
    id: "inFeed",
    name: "In-Feed",
    nameSi: "News feed ඇතුළේ",
    location: "නවතම ප්‍රවෘත්ති grid එකට පහළින්, gossip එකට ඉහළින් — news column පුරා",
    iab: "Billboard",
    widthPx: 970,
    heightPx: 250,
    fill: true,
    sizes: ["970 × 250"],
    minHeight: "250px",
    width: "Main column (~900–970px)",
    type: "AdSense or direct",
  },
  {
    id: "sidebar",
    name: "Sidebar Rectangle",
    nameSi: "උඩු අතට තීරුව",
    location: "Desktop දකුණු sidebar (300px column)",
    iab: "Medium Rectangle",
    widthPx: 300,
    heightPx: 250,
    fill: false,
    sizes: ["300 × 250"],
    minHeight: "250px",
    width: "300px",
    type: "AdSense or direct",
  },
  {
    id: "footer",
    name: "Footer Banner",
    nameSi: "Footer ට ඉහළ Banner",
    location: "Brand promo cards වලට පහළින්, footer ට ඉහළින්, full content width",
    iab: "Full-width banner",
    widthPx: 1280,
    heightPx: 160,
    fill: true,
    sizes: ["1280 × 160"],
    minHeight: "160px",
    width: "100% (max 1280px)",
    type: "AdSense or direct",
  },
  {
    id: "partnerStrip",
    name: "Partner Strip",
    nameSi: "Full-width partner band",
    location: "News section ට පහළින්, content width black band",
    iab: "Full-width band",
    widthPx: 1280,
    heightPx: 160,
    fill: true,
    sizes: ["1280 × 160"],
    minHeight: "160px",
    width: "100% (max 1280px)",
    type: "Direct only",
  },
] as const;

export type HomeAdSlotDef = (typeof HOME_AD_SLOTS)[number];
export type HomeAdSlotDefId = HomeAdSlotDef["id"];

/** Pixel boxes used on the homepage — scale by CSS aspect-ratio. */
export const HOME_AD_SLOT_PIXELS: Record<
  HomeAdSlotDefId,
  { width: number; height: number; fill: boolean }
> = Object.fromEntries(
  HOME_AD_SLOTS.map((slot) => [
    slot.id,
    { width: slot.widthPx, height: slot.heightPx, fill: slot.fill },
  ]),
) as Record<HomeAdSlotDefId, { width: number; height: number; fill: boolean }>;

export function slotSizeLabel(id: HomeAdSlotDefId): string {
  const { width, height } = HOME_AD_SLOT_PIXELS[id];
  return `${width} × ${height}`;
}

export const PROMOTION_PACKAGES = [
  {
    title: "Website Banners",
    detail:
      "Live player 300×250, homepage header 1280×160, in-feed 970×250, sidebar 300×250, footer 1280×160 — weekly or monthly.",
  },
  {
    title: "Sponsored Story",
    detail:
      "News හෝ gossip article එකක් branded headline, cover image සහ site + social share එකක් සමඟ.",
  },
  {
    title: "Radio Spot",
    detail:
      "Live FM Heart stream එකේ commercial, RJ mention, හෝ show sponsorship.",
  },
  {
    title: "Social Boost",
    detail:
      "Facebook, Instagram සහ TikTok shoutouts — website campaign එකට එකතු කරන්න.",
  },
] as const;
