import { createHash } from "crypto";
import { getAdminDb } from "@/lib/firebase/admin";

export type NewsSource = {
  id: string;
  name: string;
  rss: string;
  category: string;
  active?: boolean;
};

export const DEFAULT_NEWS_SOURCES: NewsSource[] = [
  {
    id: "ada-lk",
    name: "Ada",
    rss: "https://www.ada.lk/rss/latest_news/1",
    category: "දේශීය",
    active: true,
  },
  {
    id: "adaderana",
    name: "Ada Derana",
    rss: "https://www.adaderana.lk/rss.php",
    category: "දේශීය",
    active: true,
  },
  {
    id: "bbc-sinhala",
    name: "BBC Sinhala",
    rss: "https://feeds.bbci.co.uk/sinhala/rss.xml",
    category: "ජාත්‍යන්තර",
    active: true,
  },
];

type FeedItem = {
  title: string;
  sourceUrl: string;
  excerpt: string;
  body: string;
  coverImage: string;
};

function stripHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(title: string): string {
  const ascii = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = Date.now().toString(36);
  return ascii.length >= 3 ? `${ascii}-${suffix}` : `news-${suffix}`;
}

function sourceHash(sourceUrl: string, title: string): string {
  return createHash("sha256")
    .update(`${sourceUrl.trim().toLowerCase()}|${title.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 40);
}

function readingTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function firstImageFromXml(block: string): string {
  const media = block.match(/url=["']([^"']+)["']/i);
  if (media?.[1] && /\.(jpe?g|png|webp|gif)/i.test(media[1])) return media[1];
  const img = block.match(/<img[^>]+src=["']([^"']+)["']/i);
  return img?.[1] || "";
}

function parseRssItems(xml: string, limit: number): FeedItem[] {
  const items: FeedItem[] = [];
  const chunks = xml.split(/<item[\s>]/i).slice(1);
  for (const chunk of chunks.slice(0, limit)) {
    const title = stripHtml(
      chunk.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "",
    );
    const link = stripHtml(
      chunk.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ||
        chunk.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1] ||
        "",
    );
    const description = stripHtml(
      chunk.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] || "",
    );
    const content = stripHtml(
      chunk.match(
        /<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i,
      )?.[1] || "",
    );
    if (!title) continue;
    const body = (content || description || title).slice(0, 4000);
    items.push({
      title,
      sourceUrl: link,
      excerpt: (description || title).slice(0, 400),
      body,
      coverImage: firstImageFromXml(chunk),
    });
  }
  return items;
}

async function fetchRss(url: string, limit: number): Promise<FeedItem[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "FMHeartNewsBot/1.0 (+https://fmheart.lk)",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`RSS ${res.status} for ${url}`);
  const xml = await res.text();
  return parseRssItems(xml, limit);
}

function jaccard(a: string, b: string): number {
  const A = new Set(a.split(/\s+/).filter(Boolean));
  const B = new Set(b.split(/\s+/).filter(Boolean));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

export type IngestResult = {
  source: string;
  fetched: number;
  created: number;
  skipped: number;
  error?: string;
};

export async function runNewsIngest(options?: {
  maxPerSource?: number;
  sources?: NewsSource[];
}): Promise<{ ok: boolean; results: IngestResult[]; createdIds: string[] }> {
  const db = getAdminDb();
  if (!db) {
    throw new Error(
      "Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON on Vercel.",
    );
  }

  const maxPerSource = options?.maxPerSource ?? 8;
  const sources = (options?.sources ?? DEFAULT_NEWS_SOURCES).filter(
    (s) => s.active !== false,
  );
  const results: IngestResult[] = [];
  const createdIds: string[] = [];

  const recentSnap = await db
    .collection("articles")
    .orderBy("createdAt", "desc")
    .limit(80)
    .get()
    .catch(() => null);
  const recentTitles = (recentSnap?.docs ?? []).map((d) =>
    String(d.data().title || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " "),
  );

  for (const src of sources) {
    const row: IngestResult = {
      source: src.name,
      fetched: 0,
      created: 0,
      skipped: 0,
    };
    try {
      const items = await fetchRss(src.rss, maxPerSource);
      row.fetched = items.length;

      for (const item of items) {
        const title = item.title.trim();
        const hash = sourceHash(item.sourceUrl, title);
        const dupHash = await db
          .collection("articles")
          .where("sourceHash", "==", hash)
          .limit(1)
          .get();
        if (!dupHash.empty) {
          row.skipped += 1;
          continue;
        }

        const needle = title.toLowerCase().replace(/\s+/g, " ");
        const similar = recentTitles.some(
          (t) => t === needle || jaccard(t, needle) >= 0.9,
        );
        if (similar) {
          row.skipped += 1;
          continue;
        }

        let body = item.body;
        if (item.sourceUrl && !body.includes("මූලාශ්‍ර")) {
          body = `${body}\n\n—\nමූලාශ්‍ර: ${src.name}\n${item.sourceUrl}`;
        }

        const now = new Date().toISOString();
        const ref = await db.collection("articles").add({
          type: "news",
          title,
          slug: slugify(title),
          excerpt: item.excerpt || title,
          body,
          category: src.category,
          coverImage: item.coverImage || "",
          author: `FM Heart · ${src.name}`,
          status: "draft",
          tags: [src.name, src.category],
          readingTimeMin: readingTime(body),
          views: 0,
          createdAt: now,
          updatedAt: now,
          publishedAt: null,
          seoTitle: title,
          seoDescription: item.excerpt || title,
          source: src.name,
          sourceUrl: item.sourceUrl,
          sourceHash: hash,
          ingestedBy: "newsbot",
        });

        createdIds.push(ref.id);
        recentTitles.unshift(needle);
        row.created += 1;
      }
    } catch (err) {
      row.error = err instanceof Error ? err.message : String(err);
    }
    results.push(row);
  }

  return { ok: true, results, createdIds };
}
