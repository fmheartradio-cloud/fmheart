/** Homepage ad inventory — sizes match live layout in `src/app/page.tsx`. */

export const HOME_AD_SLOTS = [
  {
    id: "player",
    name: "Live Player Banner",
    nameSi: "Radio player ඇතුළේ",
    location: "Homepage live radio box එකේ Recently Played තිබුණු තැන",
    iab: "Medium Rectangle",
    sizes: ["300 × 250"],
    minHeight: "250px",
    width: "300px",
    type: "AdSense or direct",
  },
  {
    id: "header",
    name: "Header Banner",
    nameSi: "ප්‍රධාන Banner",
    location: "Hero slider සහ live radio එකට පහළින්, full content width",
    iab: "Leaderboard",
    sizes: ["728 × 90 — same ratio on mobile & desktop"],
    minHeight: "90px",
    width: "100% (max ~1280px)",
    type: "AdSense or direct",
  },
  {
    id: "inFeed",
    name: "In-Feed",
    nameSi: "News feed ඇතුළේ",
    location: "නවතම ප්‍රවෘත්ති grid එකට පහළින්, gossip එකට ඉහළින්",
    iab: "In-feed / Medium Rectangle",
    sizes: ["300 × 250", "336 × 280", "fluid responsive"],
    minHeight: "100px",
    width: "Main column",
    type: "AdSense or direct",
  },
  {
    id: "sidebar",
    name: "Sidebar Rectangle",
    nameSi: "උඩු අතට තීරුව",
    location: "Desktop දකුණු sidebar (300px column)",
    iab: "Medium Rectangle",
    sizes: ["300 × 250"],
    minHeight: "250px",
    width: "300px",
    type: "AdSense or direct",
  },
  {
    id: "footer",
    name: "Footer Banner",
    nameSi: "Footer ට ඉහළ Banner",
    location: "Brand promo cards වලට පහළින්, footer ට ඉහළින්",
    iab: "Leaderboard",
    sizes: ["728 × 90 — same ratio on mobile & desktop"],
    minHeight: "90px",
    width: "100% (max ~1280px)",
    type: "AdSense or direct",
  },
  {
    id: "partnerStrip",
    name: "Partner Strip",
    nameSi: "Full-width partner band",
    location: "News section ට පහළින්, page පුරාම black band",
    iab: "Custom / takeover",
    sizes: ["Full bleed · ~1200 × 160+"],
    minHeight: "160px",
    width: "Full viewport",
    type: "Direct only",
  },
] as const;

/** Pixel boxes used on the homepage — scale by CSS aspect-ratio, never swap to 320×50. */
export const HOME_AD_SLOT_PIXELS: Record<
  (typeof HOME_AD_SLOTS)[number]["id"],
  { width: number; height: number }
> = {
  player: { width: 300, height: 250 },
  header: { width: 728, height: 90 },
  inFeed: { width: 300, height: 250 },
  sidebar: { width: 300, height: 250 },
  footer: { width: 728, height: 90 },
  partnerStrip: { width: 1200, height: 160 },
};

export const PROMOTION_PACKAGES = [
  {
    title: "Website Banners",
    detail:
      "Live player 300×250, homepage header 728×90, in-feed, sidebar 300×250, සහ footer banner — weekly or monthly.",
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
