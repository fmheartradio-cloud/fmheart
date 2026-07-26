const NAMED_ENTITIES: Record<string, string> = {
  nbsp: "\u00a0",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  zwj: "\u200d",
  zwnj: "\u200c",
};

/** Decode HTML entities including ZWJ/ZWNJ for Sinhala conjuncts. Runs multiple passes for &amp; chains. */
export function decodeHtmlEntities(raw: string): string {
  let text = raw;
  for (let pass = 0; pass < 4; pass += 1) {
    const prev = text;
    text = text
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
        const code = parseInt(hex, 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : _;
      })
      .replace(/&#(\d+);/g, (_, dec) => {
        const code = Number(dec);
        return Number.isFinite(code) ? String.fromCodePoint(code) : _;
      })
      .replace(/&([a-z]+);/gi, (match, name: string) => {
        const mapped = NAMED_ENTITIES[name.toLowerCase()];
        return mapped ?? match;
      });
    if (text === prev) break;
  }
  return text;
}

/** True when plain text still contains undecoded HTML entities. */
export function hasUndecodedHtmlEntities(text: string): boolean {
  return /&(?:zwj|zwnj|nbsp|amp|#\d+|#x[0-9a-f]+|[a-z]{2,8});/i.test(text);
}
