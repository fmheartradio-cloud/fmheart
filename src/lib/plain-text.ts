import { decodeHtmlEntities } from "@/lib/html-entities";

function unwrapCdata(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i);
  return match ? match[1] : trimmed;
}

/** Strip HTML to plain text. Decodes entities first so encoded markup is removed. */
export function stripHtml(raw: string): string {
  if (!raw) return "";
  let text = decodeHtmlEntities(unwrapCdata(raw));
  for (let pass = 0; pass < 4; pass += 1) {
    const next = decodeHtmlEntities(
      text
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/\u00a0/g, " "),
    );
    if (next === text) break;
    text = next;
  }
  return text.replace(/\s+/g, " ").trim();
}

export function containsHtmlMarkup(text: string): boolean {
  if (!text) return false;
  const decoded = decodeHtmlEntities(text);
  return /<[a-z][^>]*>/i.test(decoded) || /&lt;[a-z]/i.test(text);
}

/** Plain text for titles/body — strips HTML when present, always decodes entities. */
export function toPlainText(raw: string): string {
  if (!raw) return "";
  if (containsHtmlMarkup(raw)) return stripHtml(raw);
  return decodeHtmlEntities(raw).replace(/\s+/g, " ").trim();
}

export function toPlainExcerpt(
  excerpt: string | undefined,
  body: string,
  maxLen = 400,
): string {
  let plain = toPlainText(excerpt || "");
  if (!plain || containsHtmlMarkup(plain)) {
    plain = stripHtml(body);
  }
  if (!plain) return "";
  if (plain.length <= maxLen) return plain;
  const slice = plain.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed =
    lastSpace > maxLen * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${trimmed.trim()}…`;
}
