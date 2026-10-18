import type { CmsArticle } from "@/types/cms";

const FOREIGN_SOURCES = new Set(["Ada Derana Foreign"]);
const FOREIGN_CATEGORIES = new Set([
  "විදෙස්",
  "ලෝක පුවත්",
  "විදේශීය",
  "ජාත්‍යන්තර",
]);
const BUSINESS_CATEGORIES = new Set(["ව්‍යාපාර", "ව්‍යාපාරික"]);

export const HOME_CATEGORY_SECTIONS = [
  {
    key: "foreign" as const,
    title: "විදෙස්",
    href: "/news?category=%E0%B7%80%E0%B7%92%E0%B6%AF%E0%B7%99%E0%B7%83%E0%B7%8A",
  },
  {
    key: "business" as const,
    title: "ව්‍යාපාරික",
    href: "/news?category=%E0%B7%80%E0%B7%8A%E2%80%8D%E0%B6%BA%E0%B7%8F%E0%B6%B4%E0%B7%8F%E0%B6%BB",
  },
  {
    key: "sports" as const,
    title: "ක්‍රීඩා",
    href: "/news?category=%E0%B6%9A%E0%B7%8A%E2%80%8D%E0%B6%BB%E0%B7%93%E0%B6%A9%E0%B7%8F",
  },
] as const;

function isForeignNews(article: CmsArticle): boolean {
  const source = (article.source || "").trim();
  if (FOREIGN_SOURCES.has(source)) return true;
  if ((article.tags || []).includes("Ada Derana Foreign")) return true;
  return FOREIGN_CATEGORIES.has((article.category || "").trim());
}

function isBusinessNews(article: CmsArticle): boolean {
  return BUSINESS_CATEGORIES.has((article.category || "").trim());
}

function isSportsNews(article: CmsArticle): boolean {
  return (article.category || "").trim() === "ක්‍රීඩා";
}

export function pickHomeCategoryNews(
  articles: CmsArticle[],
  limit = 6,
): {
  foreign: CmsArticle[];
  business: CmsArticle[];
  sports: CmsArticle[];
} {
  return {
    foreign: articles.filter(isForeignNews).slice(0, limit),
    business: articles.filter(isBusinessNews).slice(0, limit),
    sports: articles.filter(isSportsNews).slice(0, limit),
  };
}
