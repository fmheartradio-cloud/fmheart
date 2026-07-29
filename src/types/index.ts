export type NewsCategory =
  | "දේශපාලන"
  | "ව්‍යාපාර"
  | "ක්‍රීඩා"
  | "තාක්ෂණය"
  | "සෞඛ්‍ය"
  | "ජීවන රටාව"
  | "ලෝක පුවත්"
  | "විදේශීය"
  | "ජාත්‍යන්තර"
  | "දේශීය";

export type GossipCategory =
  | "Film"
  | "Tele Drama"
  | "TikTok"
  | "Music"
  | "Celebrities"
  | "Fashion"
  | "Lifestyle";

export interface Article {
  id: string;
  title: string;
  excerpt?: string;
  category: string;
  image: string;
  publishedAt: string;
  slug: string;
  views?: number;
}

export interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  views: string;
  publishedAt: string;
  slug: string;
  /** YouTube / external video URL */
  videoUrl?: string;
}

export interface RadioState {
  song: string;
  artist: string;
  rj: string;
  listeners: number;
  isLive: boolean;
}
