import { SITE } from "@/lib/site";
import { listArticles } from "@/services/articles";

export async function GET() {
  const articles = await listArticles({ status: "published", limit: 40 });

  const items = articles
    .map((a) => {
      const link = `${SITE.url}/${a.type === "gossip" ? "gossip" : "news"}/${a.slug}`;
      return `
    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${link}</link>
      <guid>${link}</guid>
      <description><![CDATA[${a.excerpt}]]></description>
      <pubDate>${new Date(a.publishedAt || a.createdAt).toUTCString()}</pubDate>
      <category><![CDATA[${a.category}]]></category>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>FM Heart</title>
    <link>${SITE.url}</link>
    <description>${SITE.description}</description>
    <language>si</language>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=600, stale-while-revalidate",
    },
  });
}
