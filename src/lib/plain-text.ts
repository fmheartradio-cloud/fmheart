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

/** Strip WordPress / Yoast "The post … appeared first on …" footers. */
export function stripSyndicationFooter(text: string): string {
  if (!text) return "";
  return text
    .replace(
      /\s*The\s+post\s+[\s\S]+?\s+appeared\s+first\s+on\s+Neth\s+News\.?\s*/gi,
      " ",
    )
    .replace(
      /\s*The\s+post\s+[\s\S]+?\s+appeared\s+first\s+on\s+[^\n.]+\.?\s*/gi,
      " ",
    )
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
