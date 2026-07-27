/**
 * Smoke test: truncated RSS img tags must not leak into excerpts/hero.
 * Mirrors src/lib/plain-text.ts — run: node scripts/test-plain-text.mjs
 */

function decodeHtmlEntities(raw) {
  let text = raw;
  for (let pass = 0; pass < 4; pass += 1) {
    const prev = text;
    text = text
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCodePoint(parseInt(hex, 16)),
      )
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
      .replace(/&([a-z]+);/gi, (match, name) => {
        const map = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
        return map[name.toLowerCase()] ?? match;
      });
    if (text === prev) break;
  }
  return text;
}

function looksLikeHtmlFragment(text) {
  if (!text) return false;
  const decoded = decodeHtmlEntities(text).trim();
  if (!decoded) return false;
  return (
    /<[a-z!?/]/i.test(decoded) ||
    /&lt;[a-z]/i.test(text) ||
    /\bborder\s*=/i.test(decoded) ||
    /\bdata-original/i.test(decoded) ||
    /\bsrc\s*=\s*["']?https?:/i.test(decoded) ||
    /\bstyle\s*=/i.test(decoded)
  );
}

function stripHtml(raw) {
  if (!raw) return "";
  let text = decodeHtmlEntities(raw);
  for (let pass = 0; pass < 6; pass += 1) {
    const next = decodeHtmlEntities(
      text
        .replace(/<script[\s\S]*?(?:<\/script>|$)/gi, " ")
        .replace(/<style[\s\S]*?(?:<\/style>|$)/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<[a-z][^>]*(>|$)/gi, " ")
        .replace(/<[^>]*$/g, " ")
        .replace(/\bsrc\s*=\s*["']?https?:[^\s"'>]*/gi, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
    if (next === text) break;
    text = next;
  }
  if (looksLikeHtmlFragment(text)) return "";
  return text;
}

function toPlainExcerpt(excerpt, body, maxLen = 400) {
  let plain = stripHtml(excerpt || "");
  if (!plain || looksLikeHtmlFragment(plain)) plain = stripHtml(body);
  if (!plain || looksLikeHtmlFragment(plain)) return "";
  if (plain.length <= maxLen) return plain.includes("<") ? "" : plain;
  const slice = plain.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed =
    lastSpace > maxLen * 0.6 ? slice.slice(0, lastSpace) : slice;
  const result = `${trimmed.trim()}…`;
  if (result.includes("<") || looksLikeHtmlFragment(result)) return "";
  return result;
}

const truncatedImg =
  '<img border="0" data-original-height="394" data-original-width="700" src="https://blogger.googleusercontent.com/img/a/AVvXsEi';

const cases = [
  ["truncated img excerpt", () => toPlainExcerpt(truncatedImg, "", 280), ""],
  ["truncated img plain", () => stripHtml(truncatedImg), ""],
  ["detects truncated img", () => looksLikeHtmlFragment(truncatedImg), true],
  [
    "preserves Sinhala",
    () => toPlainExcerpt("ශ්‍රී ලංකාවේ නවතම ප්‍රවෘත්ති", "body", 280),
    "ශ්‍රී ලංකාවේ නවතම ප්‍රවෘත්ති",
  ],
];

let failed = 0;
for (const [name, fn, expect] of cases) {
  const got = fn();
  const ok = typeof expect === "boolean" ? got === expect : got === expect;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${name}: expected ${JSON.stringify(expect)}, got ${JSON.stringify(got)}`);
  } else {
    console.log(`ok ${name}`);
  }
}

if (failed) process.exit(1);
console.log("all plain-text smoke tests passed");
