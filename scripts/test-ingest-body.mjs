/** Smoke-test Ada body extraction against saved/live HTML. */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIN_BODY_CHARS = 280;

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

function stripInlineHtml(raw) {
  return decodeHtmlEntities(
    raw
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\u200c|\u200d|\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " "),
  ).trim();
}

function htmlFragmentToParagraphs(fragment) {
  let html = fragment
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const paragraphs = [];
  for (const match of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const tag = match[0];
    if (/\breco-body\b/i.test(tag)) continue;
    if (/\badsbyvli\b/i.test(match[1])) continue;
    const text = stripInlineHtml(match[1]);
    if (text.length >= 20 && !/^Reply To:/i.test(text)) paragraphs.push(text);
  }
  return paragraphs.length >= 1 ? paragraphs.join("\n\n") : stripInlineHtml(html);
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
    [
      /<div[^>]+class=["'][^"']*\bsocial-media-icons\b/i,
      /<p class="text-uppercase mb-0 text-center">\s*popular news/i,
    ],
  );
  return htmlFragmentToParagraphs(wrap);
}

const localPath = join(__dirname, "..", "tmp-ada.html");
let html;
try {
  html = readFileSync(localPath, "utf8");
  console.log("Using local tmp-ada.html");
} catch {
  const url =
    "https://www.ada.lk/uncategorized/%E0%B6%A2%E0%B6%B4%E0%B6%B1%E0%B6%BA%E0%B7%99-%E0%B6%B4%E0%B7%8A%E2%80%8D%E0%B6%9A%E0%B6%B4%E0%B6%B1%E0%B6%BA%E0%B6%A7-%E0%B6%B4%E0%B7%90%E0%B6%AF%E0%B6%B1%E0%B6%BA%E0%B6%A7-%E0%B6%B4%E0%B6%90%E0%B6%BD-%E0%B6%B4%E0%B6%91%E0%B7%8A%E0%B6%AD-%E0%B6%B4%E0%B6%83%E0%B7%83-%E0%B6%BB%E0%B6%AE-7%E0%B6%9A%E0%B7%8A-%E0%B6%BD%E0%B6%82%E0%B6%9A%E0%B6%B8%E0%B6%B8%E0%B6%A7/1-423402";
  html = await (await fetch(url, { headers: { "User-Agent": "FMHeartNewsBot/1.0" } })).text();
  console.log("Fetched live Ada article");
}

const body = extractAdaBody(html);
console.log(`Body length: ${body.length} (min ${MIN_BODY_CHARS})`);
console.log(`Paragraphs: ${body.split("\n\n").length}`);
console.log(`Preview: ${body.slice(0, 180)}...`);
if (body.length < MIN_BODY_CHARS) process.exitCode = 1;
