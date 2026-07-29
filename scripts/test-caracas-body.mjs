/** Test Caracas (1-422989) Ada article body extraction. */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function decodeHtmlEntities(raw) {
  return raw
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function stripInlineHtml(raw) {
  return decodeHtmlEntities(
    raw
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  ).trim();
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

function extractAdaBody(html) {
  const wrap = extractContainerFragment(
    html,
    /<div[^>]+class=["'][^"']*\bsingle-body-wrap\b[^"']*["'][^>]*>/i,
    [/<div[^>]+class=["'][^"']*\bsocial-media-icons\b/i],
  );
  const paragraphs = [];
  for (const match of wrap.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    if (/\breco-body\b/i.test(match[0])) continue;
    const text = stripInlineHtml(match[1]);
    if (text.length >= 20) paragraphs.push(text);
  }
  return paragraphs.join("\n\n");
}

const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";
const rss = await fetch("https://www.ada.lk/rss/latest_news/1", {
  headers: { "User-Agent": UA },
}).then((r) => r.text());
const linkMatch = rss.match(/<link>([^<]*1-422989)<\/link>/);
if (!linkMatch) throw new Error("Caracas item not in RSS");
const url = linkMatch[1];
const titleMatch = rss.match(
  new RegExp(
    `<item>[\\s\\S]*?<title>([^<]+)<\\/title>[\\s\\S]*?<link>${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
  ),
);
const title = titleMatch?.[1] || "";
const html = await fetch(url, { headers: { "User-Agent": UA } }).then((r) => r.text());
const body = extractAdaBody(html);
console.log(JSON.stringify({
  url,
  titleLen: title.length,
  bodyLen: body.length,
  bodyGtTitle: body.length > title.length,
  paragraphs: body.split("\n\n").length,
  titlePreview: title.slice(0, 80),
  bodyPreview: body.slice(0, 120),
  bodyPara2: body.split("\n\n")[1]?.slice(0, 120) || null,
}, null, 2));
