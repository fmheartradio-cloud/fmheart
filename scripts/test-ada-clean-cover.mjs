/** Verify Ada cover picks body photo over og share card. */
import { readFileSync } from "fs";
import { pathToFileURL } from "url";

// Inline the key functions by importing compiled module after build, or test live fetch:
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

function decodeHtmlEntities(raw) {
  return raw
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

function extractContainerFragment(html, openPattern, endMarkers) {
  const openMatch = html.match(openPattern);
  if (!openMatch) return "";
  const startIdx = html.indexOf(openMatch[0]) + openMatch[0].length;
  let endIdx = html.length;
  const tail = html.slice(startIdx);
  for (const marker of endMarkers) {
    const hit = tail.match(marker);
    if (hit?.index !== undefined) endIdx = Math.min(endIdx, startIdx + hit.index);
  }
  return html.slice(startIdx, endIdx);
}

const JUNK_IMAGE_RE =
  /logo|icon|avatar|pixel|spacer|1x1|tracking|badge|sprite|facebook|instagram|youtube|twitter|instagrame/i;

function extractAdaArticleCoverImage(html, pageUrl) {
  const wrap = extractContainerFragment(
    html,
    /<div[^>]+class=["'][^"']*\bsingle-body-wrap\b[^"']*["'][^>]*>/i,
    [
      /<div[^>]+class=["'][^"']*\bsocial-media-icons\b/i,
      /<p class="text-uppercase mb-0 text-center">\s*popular news/i,
      /<div[^>]+class=["'][^"']*\bcomment-form\b/i,
      /\breco-body\b/i,
    ],
  );
  if (!wrap) return "";
  const candidates = [];
  for (const match of wrap.matchAll(/<img[^>]+>/gi)) {
    const tag = match[0];
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (!src || /^data:/i.test(src) || JUNK_IMAGE_RE.test(src)) continue;
    const offset = match.index ?? 0;
    const local = wrap.slice(Math.max(0, offset - 220), offset + tag.length);
    if (/breaking_news|reco-body|related-news|popular news/i.test(local)) continue;
    candidates.push(src);
  }
  return candidates.find((u) => /cdn\.ada\.lk\/assets\/uploads\/image_/i.test(u)) || candidates[0] || "";
}

function extractOg(html) {
  return (
    html.match(/property=["']og:image[^"']*["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:image/i)?.[1] ||
    ""
  );
}

const url =
  "https://www.ada.lk/uncategorized/%E0%B6%A2%E0%B6%B4%E0%B6%B1%E0%B6%BA%E0%B7%99-%E0%B6%B4%E0%B7%8A%E2%80%8D%E0%B6%9A%E0%B6%B4%E0%B6%B1%E0%B6%BA%E0%A7%80-%E0%B6%B4%E0%B7%90%E0%B6%AF%E0%B6%B1%E0%B6%BA%E0%A7%80-%E0%B6%B4%E0%B6%90%E0%B6%BD-%E0%B6%B4%E0%B6%91%E0%B7%8A%E0%B6%AD-%E0%B6%B4%E0%B6%83%E0%B7%83-%E0%B6%BB%E0%B6%AE-7%E0%B6%9A%E0%B7%8A-%E0%B6%BD%E0%B6%82%E0%B6%9A%E0%B6%B8%E0%B6%B8%E0%A7%87/1-423402";

const html = await (
  await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) })
).text();

const og = extractOg(html);
const body = extractAdaArticleCoverImage(html, url);
console.log("og:  ", og.split("/").pop());
console.log("body:", body.split("/").pop());
if (!body || body === og) {
  console.error("FAIL: expected different clean body image");
  process.exit(1);
}
console.log("OK — body image differs from og share card");
