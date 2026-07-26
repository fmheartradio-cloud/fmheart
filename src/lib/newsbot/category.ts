import type { NewsCategory } from "@/types";

/** Labels used across FM Heart (NewsCategory + home CategoryIcons). */
export const FM_HEART_NEWS_CATEGORIES = [
  "දේශීය",
  "දේශපාලන",
  "ව්‍යාපාර",
  "ක්‍රීඩා",
  "තාක්ෂණය",
  "සෞඛ්‍ය",
  "ජීවන රටාව",
  "ලෝක පුවත්",
  "විදේශීය",
  "ජාත්‍යන්තර",
] as const satisfies readonly NewsCategory[];

export type FmHeartNewsCategory = (typeof FM_HEART_NEWS_CATEGORIES)[number];

const URL_SEGMENT_TO_CATEGORY: Record<string, FmHeartNewsCategory> = {
  sports: "ක්‍රීඩා",
  sport: "ක්‍රීඩා",
  cricket: "ක්‍රීඩා",
  football: "ක්‍රීඩා",
  "local-news": "දේශීය",
  local: "දේශීය",
  international: "ලෝක පුවත්",
  world: "ලෝක පුවත්",
  global: "ලෝක පුවත්",
  foreign: "ලෝක පුවත්",
  political: "දේශපාලන",
  politics: "දේශපාලන",
  business: "ව්‍යාපාර",
  finance: "ව්‍යාපාර",
  economy: "ව්‍යාපාර",
  entertainment: "ජීවන රටාව",
  lifestyle: "ජීවන රටාව",
  travel: "ජීවන රටාව",
  gossip: "ජීවන රටාව",
  tech: "තාක්ෂණය",
  technology: "තාක්ෂණය",
  health: "සෞඛ්‍ය",
  medical: "සෞඛ්‍ය",
};

const RSS_TAG_TO_CATEGORY: Record<string, FmHeartNewsCategory> = {
  sports: "ක්‍රීඩා",
  sport: "ක්‍රීඩා",
  cricket: "ක්‍රීඩා",
  football: "ක්‍රීඩා",
  international: "ලෝක පුවත්",
  world: "ලෝක පුවත්",
  politics: "දේශපාලන",
  political: "දේශපාලන",
  business: "ව්‍යාපාර",
  finance: "ව්‍යාපාර",
  economy: "ව්‍යාපාර",
  entertainment: "ජීවන රටාව",
  lifestyle: "ජීවන රටාව",
  tech: "තාක්ෂණය",
  technology: "තාක්ෂණය",
  health: "සෞඛ්‍ය",
  local: "දේශීය",
  latest: "දේශීය",
};

type KeywordRule = {
  category: FmHeartNewsCategory;
  patterns: RegExp[];
};

/** First matching rule wins — most specific topics first. */
const KEYWORD_RULES: KeywordRule[] = [
  {
    category: "ක්‍රීඩා",
    patterns: [
      /\b(?:cricket|football|soccer|rugby|tennis|basketball|olympic|athletics|badminton|volleyball|hockey|golf|f1|formula\s*one)\b/i,
      /(?:ක්‍රිකට්|පාපන්දු|රග්බි|ටෙනිස්|පිහිනුම|වොලිබෝල්|ක්‍රීඩ|තරග|ලෝක\s*කුසලාන|world\s*cup|t20|odi|test\s*match|premier\s*league|champions\s*league|euro\s*202|ipl|nba|fifa|uefa|wimbledon|ashes)/i,
    ],
  },
  {
    category: "දේශපාලන",
    patterns: [
      /\b(?:parliament|cabinet|election|referendum|president|prime\s*minister|minister|mp\b|senate|congress|politic)\b/i,
      /(?:පාර්ලි|ජනාධිපති|අග(?:මැති|මංත්‍රී)|මන්ත්‍රී|ඇමති|ඡන්ද|මැතිවරණ|දේශපාලන|ආණ්ඩු|විපක්ෂ|රජය|ජනතා\s*පක්ෂ)/i,
    ],
  },
  {
    category: "ව්‍යාපාර",
    patterns: [
      /\b(?:business|economy|economic|stock|shares|market|trade|gdp|inflation|bank|corporate|company|startup|investment|export|import|tax|budget|finance)\b/i,
      /(?:ව්‍යාපාර|ආර්ථික|කොටස්|බැංකු|සංස්ථා|ආයෝජ|බදු|අයවැය|වෙළඳ|නිෂ්පාද|රැකියා\s*අවස්ථ)/i,
    ],
  },
  {
    category: "තාක්ෂණය",
    patterns: [
      /\b(?:technology|tech|software|hardware|computer|smartphone|mobile|internet|cyber|digital|ai\b|artificial\s*intelligence|robot|blockchain|crypto|app\b|startup\s*tech)\b/i,
      /(?:තාක්ෂණ|ඩිජිටල|අන්තර්ජාල|සයිබර්|පරිගණක|මොබයිල|සොෆ්ට්|හැකිළ|AI|කෘතිම\s*බුද්ධ)/i,
    ],
  },
  {
    category: "සෞඛ්‍ය",
    patterns: [
      /\b(?:health|hospital|doctor|medical|disease|virus|covid|vaccine|who\b|cancer|surgery|patient|pharma|medicine)\b/i,
      /(?:සෞඛ්‍ය|රෝහල|වෛද්‍ය|රෝග|සැත්කම|ඖෂධ|වෛරස)/i,
    ],
  },
  {
    category: "ජීවන රටාව",
    patterns: [
      /\b(?:entertainment|film|movie|cinema|music|concert|celebrity|fashion|model|beauty|pageant|drama|tele\s*drama|tiktok|travel|festival|wedding)\b/i,
      /(?:මොඩල|සිනම|චිත්‍ර|නාට්‍ය|සංගීත|ගීත|තරු|නිළි|නිළිය|උත්සව|සංචාර|රූප\s*ලාව)/i,
    ],
  },
  {
    category: "ලෝක පුවත්",
    patterns: [
      /\b(?:international|global|foreign|worldwide|united\s*nations|nato|eu\b|european\s*union|america|usa|uk\b|china|japan|russia|iran|israel|palestine|ukraine|syria|iraq|afghanistan|france|germany|italy|spain|australia|canada|india|pakistan|bangladesh|saudi|yemen|lebanon|turkey|korea|taiwan|myanmar|nepal|maldives)\b/i,
      /(?:ජාත්‍යන්තර|විදේශ|ලෝක\s*පු|ඇමරික|චීන|ජප(?:ා|)න|රුස(?:ි|)ය|ඉර(?:ා|)න|ඊශ්‍රා(?:ය|)ල|පල(?:ස්|)ත(?:ී|)න|යුක්(?:්|)ර(?:ේ|)න|ස්ප(?:ා|)ඤ|ඇ(?:ෆ|)ග(?:ා|)න(?:ි|)ස්(?:්|)ත(?:ා|)න|ස(?:ි|)ර(?:ි|)ය|ඉ(?:්|)ර(?:ා|)ක)/i,
    ],
  },
];

function normalizeText(...parts: (string | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryFromUrl(sourceUrl: string): FmHeartNewsCategory | null {
  if (!sourceUrl) return null;
  try {
    const segments = new URL(sourceUrl).pathname
      .split("/")
      .map((s) => decodeURIComponent(s).trim().toLowerCase())
      .filter(Boolean);
    for (const segment of segments) {
      if (
        segment === "uncategorized" ||
        segment === "news" ||
        segment === "breaking-news" ||
        /^\d+$/.test(segment)
      ) {
        continue;
      }
      const mapped = URL_SEGMENT_TO_CATEGORY[segment];
      if (mapped) return mapped;
    }
  } catch {
    /* ignore invalid URLs */
  }
  return null;
}

function categoryFromRssTags(tags: string[] | undefined): FmHeartNewsCategory | null {
  for (const raw of tags || []) {
    const key = raw.trim().toLowerCase();
    if (!key || key === "latest") continue;
    const mapped = RSS_TAG_TO_CATEGORY[key];
    if (mapped && mapped !== "දේශීය") return mapped;
  }
  return null;
}

function categoryFromKeywords(text: string): FmHeartNewsCategory | null {
  for (const rule of KEYWORD_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) return rule.category;
    }
  }
  return null;
}

export type CategoryInferenceInput = {
  sourceId: string;
  sourceDefaultCategory: string;
  sourceUrl?: string;
  title: string;
  excerpt?: string;
  rssCategories?: string[];
};

export function inferNewsCategory(input: CategoryInferenceInput): string {
  if (input.sourceId === "bbc-sinhala") {
    return "ජාත්‍යන්තර";
  }

  const text = normalizeText(input.title, input.excerpt);

  const fromUrl = categoryFromUrl(input.sourceUrl || "");
  if (fromUrl) return fromUrl;

  const fromRss = categoryFromRssTags(input.rssCategories);
  if (fromRss) return fromRss;

  const fromKeywords = categoryFromKeywords(text);
  if (fromKeywords) return fromKeywords;

  return input.sourceDefaultCategory || "දේශීය";
}

export function shouldUpgradeIngestedCategory(
  existingCategory: string,
  sourceDefaultCategory: string,
  inferredCategory: string,
): boolean {
  const existing = existingCategory.trim();
  const sourceDefault = sourceDefaultCategory.trim();
  const inferred = inferredCategory.trim();
  if (!existing || !inferred || existing === inferred) return false;
  return existing === sourceDefault;
}

export function mergeIngestTags(
  existingTags: unknown,
  sourceName: string,
  sourceDefaultCategory: string,
  category: string,
): string[] {
  const base = Array.isArray(existingTags)
    ? existingTags.map((t) => String(t).trim()).filter(Boolean)
    : [sourceName, sourceDefaultCategory];
  const next = base.map((tag) =>
    tag === sourceDefaultCategory ? category : tag,
  );
  if (!next.includes(sourceName)) next.unshift(sourceName);
  if (!next.includes(category)) next.push(category);
  return next;
}
