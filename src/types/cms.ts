export type ContentType = "news" | "gossip";

export type ArticleStatus = "draft" | "published" | "archived";

export interface CmsArticle {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  coverImage: string;
  author: string;
  status: ArticleStatus;
  tags: string[];
  readingTimeMin: number;
  views: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  seoTitle?: string;
  seoDescription?: string;
}

export interface CmsArticleInput {
  type: ContentType;
  title: string;
  slug?: string;
  excerpt: string;
  body: string;
  category: string;
  coverImage: string;
  author: string;
  status: ArticleStatus;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
}
