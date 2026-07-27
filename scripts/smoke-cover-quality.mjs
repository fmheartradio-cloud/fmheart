/** Smoke test cover resolution for current newsbot sources. */
import {
  estimateImageWidth,
  finalizeCoverUrl,
  needsHigherQualityCover,
  pickBestCoverUrl,
  upgradeImageUrl,
} from "../src/lib/image-url.ts";

const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

const samples = [
  ["Ada Derana RSS thumb", "https://s3.amazonaws.com/adaderanasinhala/1785141011-elnino_S.jpg"],
  ["Ada Derana og", "https://s3.amazonaws.com/adaderanasinhala/1785141011-elnino_M.jpg"],
  ["Lanka Hot RSS", "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh0jpWbcXNaP2U2FR6bbs5a7jsa43js_CAhgp-5-f6tpoyKeTjrqtaHdJDJ_iqGGyY2Q_z8vYzoJmx4D_lI0ayGwyk_bNbOTeoDRWW92zD56tSUQfaHqcO2EDwis_FOnWb6MA3joJshvM9A-VLB6XquRM8x3uptbvAxnD8-8OzYWtQqqnXdLUVqFMVccM_T/s72-w320-h167-c/villa-750x375.jpg"],
  ["Lanka Hot og", "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh0jpWbcXNaP2U2FR6bbs5a7jsa43js_CAhgp-5-f6tpoyKeTjrqtaHdJDJ_iqGGyY2Q_z8vYzoJmx4D_lI0ayGwyk_bNbOTeoDRWW92zD56tSUQfaHqcO2EDwis_FOnWb6MA3joJshvM9A-VLB6XquRM8x3uptbvAxnD8-8OzYWtQqqnXdLUVqFMVccM_T/w1200-h630-p-k-no-nu/villa-750x375.jpg"],
  ["Neth og", "https://www.nethnews.lk/wp-content/uploads/2026/07/27-2.jpg"],
];

console.log("=== URL upgrades ===");
for (const [label, url] of samples) {
  const upgraded = upgradeImageUrl(url);
  console.log(`${label}`);
  console.log(`  needsHQ: ${needsHigherQualityCover(url)} width=${estimateImageWidth(url)}`);
  console.log(`  upgraded width=${estimateImageWidth(upgraded)}`);
  console.log(`  ${upgraded.slice(0, 100)}...`);
}

console.log("\n=== pickBestCoverUrl ===");
const adaBest = pickBestCoverUrl(samples[0][1], samples[1][1]);
console.log("Ada:", adaBest.includes("_L") || adaBest.includes("_M") ? "ok" : adaBest);

const hotBest = pickBestCoverUrl(samples[2][1], samples[3][1]);
console.log("Lanka Hot:", hotBest.includes("w1200") ? "ok" : hotBest);

async function probeLive() {
  const feeds = [
    ["Neth", "https://www.nethnews.lk/feed/"],
    ["Ada Derana", "https://sinhala.adaderana.lk/rsshotnews.php"],
    ["Lanka Hot", "https://www.lankahotnews.net/rss.xml"],
  ];
  for (const [name, url] of feeds) {
    const xml = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
    const chunk = xml.split(/<item[\s>]/i)[1];
    const link = (chunk.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || "").replace(/<[^>]+>/g, "").trim();
    const rssImg = [...chunk.matchAll(/url=["']([^"']+)["']/gi)].map((m) => m[1]).find((u) => /\.(jpe?g|png|webp)/i.test(u)) || "";
    const page = await fetch(link, { headers: { "User-Agent": UA } });
    const html = await page.text();
    const og = html.match(/property=["']og:image[^"']*["'][^>]*content=["']([^"']+)["']/i)?.[1] || "";
    const resolved = finalizeCoverUrl(pickBestCoverUrl(og, rssImg));
    console.log(`\n${name}: ${resolved ? "COVER OK" : "MISSING"} width=${estimateImageWidth(resolved)}`);
  }
}

await probeLive();
