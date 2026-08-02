import { decodeHtmlEntities } from "@/lib/html-entities";

function unwrapCdata(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i);
  return match ? match[1] : trimmed;
}

/** True when text still looks like HTML markup or attribute fragments after stripping. */
export function looksLikeHtmlFragment(text: string): boolean {
  if (!text) return false;
  const decoded = decodeHtmlEntities(text).trim();
  if (!decoded) return false;
  return (
    /<[a-z!?/]/i.test(decoded) ||
    /&lt;[a-z]/i.test(text) ||
    /\bborder\s*=/i.test(decoded) ||
    /\bdata-original/i.test(decoded) ||
    /\bsrc\s*=\s*["']?https?:/i.test(decoded) ||
    /\bstyle\s*=/i.test(decoded) ||
    /\b(?:width|height|alt|class|id)\s*=\s*["']/i.test(decoded)
  );
}

function stripIncompleteTags(text: string): string {
  return text
    .replace(/<script[\s\S]*?(?:<\/script>|$)/gi, " ")
    .replace(/<style[\s\S]*?(?:<\/style>|$)/gi, " ")
    .replace(/<noscript[\s\S]*?(?:<\/noscript>|$)/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/[a-z][^>]*>/gi, " ")
    .replace(/<[a-z][^>]*(>|$)/gi, " ")
    .replace(/<[^>]*$/g, " ");
}

function stripAttributeFragments(text: string): string {
  return text
    .replace(/\bsrc\s*=\s*["']?https?:[^\s"'>]*/gi, " ")
    .replace(
      /\b(?:border|style|data-[a-z0-9-]+|class|id|width|height|alt)\s*=\s*["'][^"']*["']/gi,
      " ",
    )
    .replace(
      /\b(?:border|style|data-[a-z0-9-]+)\s*=\s*[^\s"'>]+/gi,
      " ",
    );
}

/** Strip HTML to plain text. Decodes entities first so encoded markup is removed. */
export function stripHtml(raw: string): string {
  if (!raw) return "";
  let text = decodeHtmlEntities(unwrapCdata(raw));
  for (let pass = 0; pass < 6; pass += 1) {
    const next = decodeHtmlEntities(
      stripAttributeFragments(
        stripIncompleteTags(text).replace(/\u00a0/g, " "),
      ),
    );
    if (next === text) break;
    text = next;
  }
  text = text.replace(/\s+/g, " ").trim();
  if (looksLikeHtmlFragment(text)) return "";
  return text;
}

export function containsHtmlMarkup(text: string): boolean {
  if (!text) return false;
  const decoded = decodeHtmlEntities(text);
  return (
    /<[a-z!?][^>]*(>|$)/i.test(decoded) ||
    /&lt;[a-z]/i.test(text) ||
    looksLikeHtmlFragment(decoded)
  );
}

/** Strip WordPress / Yoast "The post … appeared first on …" footers
 *  and Lanka Hot News share CTAs that leak into plain body text. */
export function stripSyndicationFooter(text: string): string {
  if (!text) return "";
  return stripLankaCNewsBrand(
    stripNethReporterAttribution(
      text
        .replace(
          /\s*The\s+post\s+[\s\S]+?\s+appeared\s+first\s+on\s+Neth\s+News\.?\s*/gi,
          " ",
        )
        .replace(
          /\s*The\s+post\s+[\s\S]+?\s+appeared\s+first\s+on\s+[^\n.]+\.?\s*/gi,
          " ",
        )
        // Lanka Hot News in-body share widget → plain text
        .replace(
          /\s*මේ\s*පුවත\s*තව\s*අයට\s*බලන්න[\s\S]*?WhatsApp\s*එකට\s*Share\s*කරන්න\.?\s*/giu,
          " ",
        )
        .replace(
          /\s*Facebook\s*එකට\s*Share\s*කරන්න\s*WhatsApp\s*එකට\s*Share\s*කරන්න\.?\s*/giu,
          " ",
        )
        .replace(
          /\s*මේ\s*පුවත\s*තව\s*අයට\s*බලන්න\s*/giu,
          " ",
        )
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    ),
  );
}

/**
 * Lanka C News site name leaked into article body (middle or end).
 * Removes "lankacnews" / "Lanka C News" / lankacnews.com — never the story text.
 */
export function stripLankaCNewsBrand(text: string): string {
  if (!text) return "";
  if (!/lankacnews|Lanka\s*C\s*News/iu.test(text)) return text;

  const brandOnly =
    /^[(\["'\s]*(?:lankacnews(?:\.com)?|Lanka\s*C\s*News)[)\]"'\s.!?…|/\\-]*$/iu;

  const paras = text.split(/\n{2,}/);
  const out: string[] = [];

  for (const para of paras) {
    const raw = para.trim();
    if (!raw) continue;

    const parts = raw.split(/(?<=[.!?…])\s+/u);
    const kept: string[] = [];

    for (const part of parts) {
      let s = part.trim();
      if (!s) continue;
      if (brandOnly.test(s)) continue;

      s = s
        .replace(/\(\s*(?:lankacnews(?:\.com)?|Lanka\s*C\s*News)\s*\)/giu, "")
        .replace(/\[\s*(?:lankacnews(?:\.com)?|Lanka\s*C\s*News)\s*\]/giu, "")
        .replace(
          /\s*[-–—|/]\s*(?:lankacnews(?:\.com)?|Lanka\s*C\s*News)\.?\s*$/giu,
          "",
        )
        .replace(
          /^\s*(?:lankacnews(?:\.com)?|Lanka\s*C\s*News)\s*[-–—:|]\s*/giu,
          "",
        )
        .replace(
          /https?:\/\/(?:www\.)?lankacnews\.com\/?\S*/giu,
          "",
        )
        .replace(/\b(?:www\.)?lankacnews\.com\b/giu, "")
        .replace(/\bLanka\s*C\s*News\b/giu, "")
        .replace(/\blankacnews\b/giu, "")
        .replace(/\s{2,}/g, " ")
        .replace(/^[,.\s:;–—|/\\-]+|[,.\s:;–—|/\\-]+$/g, "")
        .trim();

      if (!s || brandOnly.test(s)) continue;
      kept.push(s);
    }

    if (kept.length) out.push(kept.join(" "));
  }

  return out
    .join("\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Neth News in-body reporter credits:
 * - "නෙත් නිවුස් නියෝජිත ජයන්ත වීරසේකර පැවසුවේ." → drop the whole sentence
 *   (any reporter name after නියෝජිත)
 * - bare "නෙත් නිවුස්" label → remove
 * Never strip only the name mid-sentence — that would change meaning.
 */
export function stripNethReporterAttribution(text: string): string {
  if (!text) return "";
  if (!/නෙත්\s*නිවුස්|Neth\s*News/iu.test(text)) return text;

  const nethRep =
    /නෙත්\s*නිවුස්\s*නියෝජිත(?:යා|යන්|වරයා|වරුන්)?/u;
  const bareNethOnly = /^[(\["'\s]*නෙත්\s*නිවුස්[)\]"'\s.!?…]*$/u;

  const paras = text.split(/\n{2,}/);
  const out: string[] = [];

  for (const para of paras) {
    const raw = para.trim();
    if (!raw) continue;

    // Split into sentences; keep Sinhala/English end punctuation
    const parts = raw.split(/(?<=[.!?…])\s+/u);
    const kept: string[] = [];

    for (const part of parts) {
      let s = part.trim();
      if (!s) continue;

      // Whole-sentence drop: Neth correspondent + name (+ පැවසුවේ etc.)
      if (nethRep.test(s)) continue;

      // Standalone "නෙත් නිවුස්" line / stub
      if (bareNethOnly.test(s)) continue;

      // Parenthetical / trailing brand credit
      s = s
        .replace(/\(\s*නෙත්\s*නිවුස්\s*\)/gu, "")
        .replace(/\[\s*නෙත්\s*නිවුස්\s*\]/gu, "")
        .replace(/\s*[-–—]\s*නෙත්\s*නිවුස්\.?\s*$/gu, "")
        .replace(/^\s*නෙත්\s*නිවුස්\s*[-–—:]\s*/gu, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      if (!s || bareNethOnly.test(s)) continue;

      // Remaining bare "නෙත් නිවුස්" (not නියෝජිත — already handled):
      // remove the phrase; if almost nothing left, drop the sentence.
      if (/නෙත්\s*නිවුස්/u.test(s)) {
        const without = s
          .replace(/\s*නෙත්\s*නිවුස්\s*/gu, " ")
          .replace(/\s{2,}/g, " ")
          .replace(/^[,.\s:;–—-]+|[,.\s:;–—-]+$/g, "")
          .trim();
        if (without.length < 12) continue;
        s = without;
      }

      kept.push(s);
    }

    if (kept.length) out.push(kept.join(" "));
  }

  return out
    .join("\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Plain text for titles/body — strips HTML when present, always decodes entities. */
export function toPlainText(raw: string): string {
  if (!raw) return "";
  const base = containsHtmlMarkup(raw)
    ? stripHtml(raw)
    : decodeHtmlEntities(raw).replace(/\s+/g, " ").trim();
  if (!base || looksLikeHtmlFragment(base)) return "";
  return stripSyndicationFooter(base);
}

export function toPlainExcerpt(
  excerpt: string | undefined,
  body: string,
  maxLen = 400,
): string {
  let plain = toPlainText(excerpt || "");
  if (!plain || containsHtmlMarkup(plain) || looksLikeHtmlFragment(plain)) {
    plain = stripHtml(body);
  }
  if (!plain || looksLikeHtmlFragment(plain)) return "";
  if (plain.length <= maxLen) {
    return plain.includes("<") ? "" : plain;
  }
  const slice = plain.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed =
    lastSpace > maxLen * 0.6 ? slice.slice(0, lastSpace) : slice;
  const result = `${trimmed.trim()}…`;
  if (result.includes("<") || looksLikeHtmlFragment(result)) return "";
  return result;
}

/** Hero subtitle — prefer empty over any HTML-ish garbage. */
export function toHeroExcerpt(
  excerpt: string | undefined,
  body: string,
  maxLen = 280,
): string {
  const plain = toPlainExcerpt(excerpt, body, maxLen);
  if (!plain || plain.includes("<") || looksLikeHtmlFragment(plain)) return "";
  return plain;
}
