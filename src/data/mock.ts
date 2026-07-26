import type { Article, RadioState, VideoItem } from "@/types";

export const navLinks = [
  { href: "/", label: "මුල් පිටුව" },
  { href: "/live", label: "LIVE RADIO" },
  { href: "/news", label: "ප්‍රවෘත්ති" },
  { href: "/gossip", label: "GOSSIP" },
  { href: "/videos", label: "VIDEOS" },
  { href: "/advertise", label: "ADVERTISE" },
  { href: "/contact", label: "CONTACT" },
];

export const breakingHeadlines = [
  "කොළඹ ගොඩනැගිල්ලක් කඩා වැටීමෙන් අයෙක් මිය යයි — විශේෂ වාර්තාව",
  "ශ්‍රී ලංකා ක්‍රිකට් කණ්ඩායම අද රාත්‍රී තරගයට සූදානම්",
  "තරුණ ගායකයාගේ නව ගීතය YouTube එකේ ට්‍රෙන්ඩ් වෙයි",
  "කාලගුණ දෙපාර්තමේන්තුව අනතුරු ඇඟවීමක් නිකුත් කරයි",
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
    title: "කොළඹ ගොඩනැගිල්ලක් කඩා වැටී — බේරාගැනීමේ මෙහෙයුම් අඛණ්ඩව",
    excerpt: "ප්‍රදේශවාසීන් කිහිප දෙනෙකු තුවාල ලබා ඇති බව මූලික වාර්තා.",
    category: "BREAKING NEWS",
    image:
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80",
    publishedAt: "දැන්",
    slug: "colombo-building-collapse",
  },
  {
    id: "h2",
    title: "තරුණ කලාකරුවන්ගේ නව සංගීත උත්සවය කොළඹදී",
    category: "සංගීතය",
    image:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80",
    publishedAt: "1 පැයකට පෙර",
    slug: "youth-music-festival",
  },
  {
    id: "h3",
    title: "ශ්‍රී ලංකාවේ ඩිජිටල් මාධ්‍ය වෙනස් කරන නව තාක්ෂණය",
    category: "තාක්ෂණය",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80",
    publishedAt: "2 පැයකට පෙර",
    slug: "digital-media-tech",
  },
];

export const latestNews: Article[] = [
  {
    id: "n1",
    title: "පාර්ලිමේන්තුවේ විශේෂ සාකච්ඡාව අද ආරම්භ වේ",
    category: "දේශපාලන",
    image:
      "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=600&q=80",
    publishedAt: "15 මිනිත්තු",
    slug: "parliament-debate",
  },
  {
    id: "n2",
    title: "කොළඹ කොටස් වෙළෙඳපොළේ නව වාර්තාවක්",
    category: "ව්‍යාපාර",
    image:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80",
    publishedAt: "32 මිනිත්තු",
    slug: "stock-market-record",
  },
  {
    id: "n3",
    title: "ලංකා ක්‍රිකට් කණ්ඩායමේ නව තේරීම් ප්‍රකාශයි",
    category: "ක්‍රීඩා",
    image:
      "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&q=80",
    publishedAt: "1 පැය",
    slug: "cricket-selection",
  },
  {
    id: "n4",
    title: "AI තාක්ෂණය සිංහල මාධ්‍ය වෙනස් කරයි",
    category: "තාක්ෂණය",
    image:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&q=80",
    publishedAt: "2 පැය",
    slug: "ai-sinhala-media",
  },
];

export const gossipNews: Article[] = [
  {
    id: "g1",
    title: "ජනප්‍රිය නිළියගේ නව චිත්‍රපටයේ පළමු ඡායාරූප",
    category: "Film",
    image:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&q=80",
    publishedAt: "20 මිනිත්තු",
    slug: "actress-new-film",
  },
  {
    id: "g2",
    title: "ටෙලි නාට්‍ය තරුවගේ අනපේක්ෂිත ප්‍රකාශය",
    category: "Tele Drama",
    image:
      "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600&q=80",
    publishedAt: "45 මිනිත්තු",
    slug: "teledrama-star",
  },
  {
    id: "g3",
    title: "TikTok තරුවගේ වයිරල් නර්තනය මිලියන ගණන් views",
    category: "TikTok",
    image:
      "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600&q=80",
    publishedAt: "1 පැය",
    slug: "tiktok-viral-dance",
  },
  {
    id: "g4",
    title: "සංගීත තරුවන්ගේ රාත්‍රී උත්සවයේ රහස් ඡායාරූප",
    category: "Celebrities",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80",
    publishedAt: "3 පැය",
    slug: "celebrity-night",
  },
];

export const videos: VideoItem[] = [
  {
    id: "v1",
    title: "FM Heart Morning Show — අද උදෑසන විශේෂ",
    thumbnail:
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80",
    duration: "12:45",
    views: "24K",
    publishedAt: "අද",
    slug: "morning-show",
  },
  {
    id: "v2",
    title: "Celebrity Interview: තරුණ ගායකයා සමඟ",
    thumbnail:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&q=80",
    duration: "18:20",
    views: "56K",
    publishedAt: "ඊයේ",
    slug: "celebrity-interview",
  },
  {
    id: "v3",
    title: "Pulse Studio — Behind the Scenes",
    thumbnail:
      "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=600&q=80",
    duration: "08:15",
    views: "12K",
    publishedAt: "2 දින",
    slug: "pulse-studio-bts",
  },
  {
    id: "v4",
    title: "Heart Academy Student Showcase 2025",
    thumbnail:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&q=80",
    duration: "22:10",
    views: "31K",
    publishedAt: "3 දින",
    slug: "academy-showcase",
  },
];

export const mostRead: Article[] = [
  {
    id: "m1",
    title: "අද කාලගුණය: බස්නාහිර පළාතට වැසි අනතුරු ඇඟවීම්",
    category: "කාලගුණය",
    image:
      "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=200&q=80",
    publishedAt: "1 පැය",
    slug: "weather-alert",
  },
  {
    id: "m2",
    title: "නව ඉන්ධන මිල සංශෝධනය පිළිබඳ විස්තර",
    category: "ව්‍යාපාර",
    image:
      "https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=200&q=80",
    publishedAt: "2 පැය",
    slug: "fuel-price",
  },
  {
    id: "m3",
    title: "සිනමා තරුවගේ විවාහ ආරංචිය සනාථ වේ",
    category: "Gossip",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=200&q=80",
    publishedAt: "3 පැය",
    slug: "star-wedding",
  },
  {
    id: "m4",
    title: "ලෝක කුසලාන තරගාවලියේ ලංකාවේ අවස්ථාව",
    category: "ක්‍රීඩා",
    image:
      "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&q=80",
    publishedAt: "4 පැය",
    slug: "world-cup-chance",
  },
  {
    id: "m5",
    title: "WhatsApp නව update එකේ ලොකු වෙනස්කම්",
    category: "තාක්ෂණය",
    image:
      "https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=200&q=80",
    publishedAt: "5 පැය",
    slug: "whatsapp-update",
  },
];
