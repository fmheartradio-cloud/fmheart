import type { Article, RadioState, VideoItem } from "@/types";

export const navLinks = [
  { href: "/", label: "මුල් පිටුව" },
  { href: "/live", label: "LIVE RADIO" },
  { href: "/news", label: "උණුසුම් පුවත්" },
  { href: "/news?category=%E0%B6%9A%E0%B7%8A%E2%80%8D%E0%B6%BB%E0%B7%93%E0%B6%A9%E0%B7%8F", label: "ක්‍රීඩා" },
  { href: "/news?category=%E0%B7%80%E0%B7%8A%E2%80%8D%E0%B6%BA%E0%B7%8F%E0%B6%B4%E0%B7%8F%E0%B6%BB", label: "ව්‍යාපාරික" },
  { href: "/gossip", label: "GOSSIP" },
  { href: "/videos", label: "VIDEOS" },
  { href: "/advertise", label: "ADVERTISE" },
  { href: "/contact", label: "CONTACT" },
];

export const breakingHeadlines = [
  "à¶šà·œà·…à¶¹ à¶œà·œà¶©à¶±à·à¶œà·’à¶½à·Šà¶½à¶šà·Š à¶šà¶©à· à·€à·à¶§à·“à¶¸à·™à¶±à·Š à¶…à¶ºà·™à¶šà·Š à¶¸à·’à¶º à¶ºà¶ºà·’ â€” à·€à·’à·à·šà·‚ à·€à·à¶»à·Šà¶­à·à·€",
  "à·à·Šâ€à¶»à·“ à¶½à¶‚à¶šà· à¶šà·Šâ€à¶»à·’à¶šà¶§à·Š à¶šà¶«à·Šà¶©à·à¶ºà¶¸ à¶…à¶¯ à¶»à·à¶­à·Šâ€à¶»à·“ à¶­à¶»à¶œà¶ºà¶§ à·ƒà·–à¶¯à·à¶±à¶¸à·Š",
  "à¶­à¶»à·”à¶« à¶œà·à¶ºà¶šà¶ºà·à¶œà·š à¶±à·€ à¶œà·“à¶­à¶º YouTube à¶‘à¶šà·š à¶§à·Šâ€à¶»à·™à¶±à·Šà¶©à·Š à·€à·™à¶ºà·’",
  "à¶šà·à¶½à¶œà·”à¶« à¶¯à·™à¶´à·à¶»à·Šà¶­à¶¸à·šà¶±à·Šà¶­à·”à·€ à¶…à¶±à¶­à·”à¶»à·” à¶‡à¶Ÿà·€à·“à¶¸à¶šà·Š à¶±à·’à¶šà·”à¶­à·Š à¶šà¶»à¶ºà·’",
];

export const radioNow: RadioState = {
  song: "Sanda Oba Adare",
  artist: "Iraj",
  rj: "Dushan",
  listeners: 2856,
  isLive: true,
};

export const recentlyPlayed = [
  { title: "Mal Mitak", artist: "Bathiya & Santhush", time: "10:42" },
  { title: "Oba Nisa", artist: "Kasun Kalhara", time: "10:38" },
  { title: "Asa Mawatha", artist: "Amarasiri Peiris", time: "10:32" },
];

export const heroSlides: Article[] = [
  {
    id: "h1",
    title: "à¶šà·œà·…à¶¹ à¶œà·œà¶©à¶±à·à¶œà·’à¶½à·Šà¶½à¶šà·Š à¶šà¶©à· à·€à·à¶§à·“ â€” à¶¶à·šà¶»à·à¶œà·à¶±à·“à¶¸à·š à¶¸à·™à·„à·™à¶ºà·”à¶¸à·Š à¶…à¶›à¶«à·Šà¶©à·€",
    excerpt: "à¶´à·Šâ€à¶»à¶¯à·šà·à·€à·à·ƒà·“à¶±à·Š à¶šà·’à·„à·’à¶´ à¶¯à·™à¶±à·™à¶šà·” à¶­à·”à·€à·à¶½ à¶½à¶¶à· à¶‡à¶­à·’ à¶¶à·€ à¶¸à·–à¶½à·’à¶š à·€à·à¶»à·Šà¶­à·.",
    category: "BREAKING NEWS",
    image:
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80",
    publishedAt: "à¶¯à·à¶±à·Š",
    slug: "colombo-building-collapse",
  },
  {
    id: "h2",
    title: "à¶­à¶»à·”à¶« à¶šà¶½à·à¶šà¶»à·”à·€à¶±à·Šà¶œà·š à¶±à·€ à·ƒà¶‚à¶œà·“à¶­ à¶‹à¶­à·Šà·ƒà·€à¶º à¶šà·œà·…à¶¹à¶¯à·“",
    category: "à·ƒà¶‚à¶œà·“à¶­à¶º",
    image:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80",
    publishedAt: "1 à¶´à·à¶ºà¶šà¶§ à¶´à·™à¶»",
    slug: "youth-music-festival",
  },
  {
    id: "h3",
    title: "à·à·Šâ€à¶»à·“ à¶½à¶‚à¶šà·à·€à·š à¶©à·’à¶¢à·’à¶§à¶½à·Š à¶¸à·à¶°à·Šâ€à¶º à·€à·™à¶±à·ƒà·Š à¶šà¶»à¶± à¶±à·€ à¶­à·à¶šà·Šà·‚à¶«à¶º",
    category: "à¶­à·à¶šà·Šà·‚à¶«à¶º",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80",
    publishedAt: "2 à¶´à·à¶ºà¶šà¶§ à¶´à·™à¶»",
    slug: "digital-media-tech",
  },
];

export const latestNews: Article[] = [
  {
    id: "n1",
    title: "à¶´à·à¶»à·Šà¶½à·’à¶¸à·šà¶±à·Šà¶­à·”à·€à·š à·€à·’à·à·šà·‚ à·ƒà·à¶šà¶ à·Šà¶¡à·à·€ à¶…à¶¯ à¶†à¶»à¶¸à·Šà¶· à·€à·š",
    category: "à¶¯à·šà·à¶´à·à¶½à¶±",
    image:
      "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=600&q=80",
    publishedAt: "15 à¶¸à·’à¶±à·’à¶­à·Šà¶­à·”",
    slug: "parliament-debate",
  },
  {
    id: "n2",
    title: "à¶šà·œà·…à¶¹ à¶šà·œà¶§à·ƒà·Š à·€à·™à·…à·™à¶³à¶´à·œà·…à·š à¶±à·€ à·€à·à¶»à·Šà¶­à·à·€à¶šà·Š",
    category: "à·€à·Šâ€à¶ºà·à¶´à·à¶»",
    image:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80",
    publishedAt: "32 à¶¸à·’à¶±à·’à¶­à·Šà¶­à·”",
    slug: "stock-market-record",
  },
  {
    id: "n3",
    title: "à¶½à¶‚à¶šà· à¶šà·Šâ€à¶»à·’à¶šà¶§à·Š à¶šà¶«à·Šà¶©à·à¶ºà¶¸à·š à¶±à·€ à¶­à·šà¶»à·“à¶¸à·Š à¶´à·Šâ€à¶»à¶šà·à·à¶ºà·’",
    category: "à¶šà·Šâ€à¶»à·“à¶©à·",
    image:
      "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&q=80",
    publishedAt: "1 à¶´à·à¶º",
    slug: "cricket-selection",
  },
  {
    id: "n4",
    title: "AI à¶­à·à¶šà·Šà·‚à¶«à¶º à·ƒà·’à¶‚à·„à¶½ à¶¸à·à¶°à·Šâ€à¶º à·€à·™à¶±à·ƒà·Š à¶šà¶»à¶ºà·’",
    category: "à¶­à·à¶šà·Šà·‚à¶«à¶º",
    image:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&q=80",
    publishedAt: "2 à¶´à·à¶º",
    slug: "ai-sinhala-media",
  },
];

export const gossipNews: Article[] = [
  {
    id: "g1",
    title: "à¶¢à¶±à¶´à·Šâ€à¶»à·’à¶º à¶±à·’à·…à·’à¶ºà¶œà·š à¶±à·€ à¶ à·’à¶­à·Šâ€à¶»à¶´à¶§à¶ºà·š à¶´à·…à¶¸à·” à¶¡à·à¶ºà·à¶»à·–à¶´",
    category: "Film",
    image:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&q=80",
    publishedAt: "20 à¶¸à·’à¶±à·’à¶­à·Šà¶­à·”",
    slug: "actress-new-film",
  },
  {
    id: "g2",
    title: "à¶§à·™à¶½à·’ à¶±à·à¶§à·Šâ€à¶º à¶­à¶»à·”à·€à¶œà·š à¶…à¶±à¶´à·šà¶šà·Šà·‚à·’à¶­ à¶´à·Šâ€à¶»à¶šà·à·à¶º",
    category: "Tele Drama",
    image:
      "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600&q=80",
    publishedAt: "45 à¶¸à·’à¶±à·’à¶­à·Šà¶­à·”",
    slug: "teledrama-star",
  },
  {
    id: "g3",
    title: "TikTok à¶­à¶»à·”à·€à¶œà·š à·€à¶ºà·’à¶»à¶½à·Š à¶±à¶»à·Šà¶­à¶±à¶º à¶¸à·’à¶½à·’à¶ºà¶± à¶œà¶«à¶±à·Š views",
    category: "TikTok",
    image:
      "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600&q=80",
    publishedAt: "1 à¶´à·à¶º",
    slug: "tiktok-viral-dance",
  },
  {
    id: "g4",
    title: "à·ƒà¶‚à¶œà·“à¶­ à¶­à¶»à·”à·€à¶±à·Šà¶œà·š à¶»à·à¶­à·Šâ€à¶»à·“ à¶‹à¶­à·Šà·ƒà·€à¶ºà·š à¶»à·„à·ƒà·Š à¶¡à·à¶ºà·à¶»à·–à¶´",
    category: "Celebrities",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80",
    publishedAt: "3 à¶´à·à¶º",
    slug: "celebrity-night",
  },
];

export const videos: VideoItem[] = [
  {
    id: "v1",
    title: "FM Heart Morning Show â€” à¶…à¶¯ à¶‹à¶¯à·‘à·ƒà¶± à·€à·’à·à·šà·‚",
    thumbnail:
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80",
    duration: "12:45",
    views: "24K",
    publishedAt: "à¶…à¶¯",
    slug: "morning-show",
  },
  {
    id: "v2",
    title: "Celebrity Interview: à¶­à¶»à·”à¶« à¶œà·à¶ºà¶šà¶ºà· à·ƒà¶¸à¶Ÿ",
    thumbnail:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&q=80",
    duration: "18:20",
    views: "56K",
    publishedAt: "à¶Šà¶ºà·š",
    slug: "celebrity-interview",
  },
  {
    id: "v3",
    title: "Pulse Studio â€” Behind the Scenes",
    thumbnail:
      "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=600&q=80",
    duration: "08:15",
    views: "12K",
    publishedAt: "2 à¶¯à·’à¶±",
    slug: "pulse-studio-bts",
  },
  {
    id: "v4",
    title: "Heart Academy Student Showcase 2025",
    thumbnail:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&q=80",
    duration: "22:10",
    views: "31K",
    publishedAt: "3 à¶¯à·’à¶±",
    slug: "academy-showcase",
  },
];

export const mostRead: Article[] = [
  {
    id: "m1",
    title: "à¶…à¶¯ à¶šà·à¶½à¶œà·”à¶«à¶º: à¶¶à·ƒà·Šà¶±à·à·„à·’à¶» à¶´à·…à·à¶­à¶§ à·€à·à·ƒà·’ à¶…à¶±à¶­à·”à¶»à·” à¶‡à¶Ÿà·€à·“à¶¸à·Š",
    category: "à¶šà·à¶½à¶œà·”à¶«à¶º",
    image:
      "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=200&q=80",
    publishedAt: "1 à¶´à·à¶º",
    slug: "weather-alert",
  },
  {
    id: "m2",
    title: "à¶±à·€ à¶‰à¶±à·Šà¶°à¶± à¶¸à·’à¶½ à·ƒà¶‚à·à·à¶°à¶±à¶º à¶´à·’à·…à·’à¶¶à¶³ à·€à·’à·ƒà·Šà¶­à¶»",
    category: "à·€à·Šâ€à¶ºà·à¶´à·à¶»",
    image:
      "https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=200&q=80",
    publishedAt: "2 à¶´à·à¶º",
    slug: "fuel-price",
  },
  {
    id: "m3",
    title: "à·ƒà·’à¶±à¶¸à· à¶­à¶»à·”à·€à¶œà·š à·€à·’à·€à·à·„ à¶†à¶»à¶‚à¶ à·’à¶º à·ƒà¶±à·à¶® à·€à·š",
    category: "Gossip",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=200&q=80",
    publishedAt: "3 à¶´à·à¶º",
    slug: "star-wedding",
  },
  {
    id: "m4",
    title: "à¶½à·à¶š à¶šà·”à·ƒà¶½à·à¶± à¶­à¶»à¶œà·à·€à¶½à·’à¶ºà·š à¶½à¶‚à¶šà·à·€à·š à¶…à·€à·ƒà·Šà¶®à·à·€",
    category: "à¶šà·Šâ€à¶»à·“à¶©à·",
    image:
      "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&q=80",
    publishedAt: "4 à¶´à·à¶º",
    slug: "world-cup-chance",
  },
  {
    id: "m5",
    title: "WhatsApp à¶±à·€ update à¶‘à¶šà·š à¶½à·œà¶šà·” à·€à·™à¶±à·ƒà·Šà¶šà¶¸à·Š",
    category: "à¶­à·à¶šà·Šà·‚à¶«à¶º",
    image:
      "https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=200&q=80",
    publishedAt: "5 à¶´à·à¶º",
    slug: "whatsapp-update",
  },
];


