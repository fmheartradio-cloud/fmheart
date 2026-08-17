import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { listArticles } from "@/services/articles";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await listArticles({ status: "published", limit: 100 });

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/live",
    "/news",
    "/gossip",
    "/videos",
    "/about",
    "/contact",
    "/advertise",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/live" ? "hourly" : "daily",
    priority: path === "" ? 1 : 0.8,
  }));

  const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE.url}/${a.type === "gossip" ? "gossip" : "news"}/${a.slug}`,
    lastModified: new Date(a.updatedAt || a.publishedAt || Date.now()),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticRoutes, ...articleRoutes];
}
