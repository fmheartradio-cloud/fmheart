import { listArticles } from "@/services/articles";
import { getBreakingHeadlines } from "@/services/breaking";
import { getHeroSlides } from "@/services/hero";
import type { CmsArticle } from "@/types/cms";

export type CmsOverviewStats = {
  total: number;
  published: number;
  draft: number;
  archived: number;
  news: number;
  gossip: number;
  totalViews: number;
  topArticles: CmsArticle[];
  recentArticles: CmsArticle[];
  breakingCount: number;
  heroCount: number;
  gaMeasurementId: string | null;
};

export function getGaMeasurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!id || id.includes("YOUR_") || id === "G-XXXXXXXX") return null;
  return id;
}

export async function getCmsOverviewStats(): Promise<CmsOverviewStats> {
  const [articles, breaking, hero] = await Promise.all([
    listArticles({ status: "all", limit: 100 }),
    getBreakingHeadlines(),
    getHeroSlides(),
  ]);

  const published = articles.filter((a) => a.status === "published");
  const draft = articles.filter((a) => a.status === "draft");
  const archived = articles.filter((a) => a.status === "archived");
  const news = articles.filter((a) => a.type === "news");
  const gossip = articles.filter((a) => a.type === "gossip");
  const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);

  const topArticles = [...articles]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5);

  const recentArticles = [...articles]
    .sort((a, b) => {
      const ta = Date.parse(a.updatedAt || a.publishedAt || a.createdAt || "") || 0;
      const tb = Date.parse(b.updatedAt || b.publishedAt || b.createdAt || "") || 0;
      return tb - ta;
    })
    .slice(0, 5);

  return {
    total: articles.length,
    published: published.length,
    draft: draft.length,
    archived: archived.length,
    news: news.length,
    gossip: gossip.length,
    totalViews,
    topArticles,
    recentArticles,
    breakingCount: breaking.length,
    heroCount: hero.length,
    gaMeasurementId: getGaMeasurementId(),
  };
}
