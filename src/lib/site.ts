export const SITE = {
  name: "FM Heart",
  taglineSi: "යෞවනයේ හද ගැහෙන රිද්මය",
  taglineEn: "The Rhythm Of Youth Heart Beat",
  /** Browser tab + WhatsApp / social share title */
  brandTitle: "FM Heart - යෞවනයේ හද ගැහෙන රිද්මය!",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://fmheart.lk",
  description:
    "තාරුණ්‍යය ම Update වෙන ලංකාවේ Platform එක! Live Radio, News, Gossip සහ Entertainment එක ම තැනක.",
  streamUrl: "https://cast3.my-control-panel.com/proxy/fmheartn/stream",
  whatsapp: "94772175779",
  phones: ["+94 11 2 999 416", "+94 11 2 999 417"],
  email: "info@fmheart.lk",
  address: "No. 128/2b, High Level Road, Kottawa, Sri Lanka",
  social: {
    facebook: "https://facebook.com/fmheartradio",
    instagram: "https://instagram.com/fmheartradio",
    youtube: "https://youtube.com",
    tiktok: "https://tiktok.com",
  },
} as const;
