/** Probe RSS + page cover URLs for current newsbot sources. */
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

const sources = [
  ["Neth News", "https://www.nethnews.lk/feed/", "rss"],
  ["Ada Derana", "https://sinhala.adaderana.lk/rsshotnews.php", "rss"],
  ["Lanka Hot News", "https://www.lankahotnews.net/rss.xml", "rss"],
  ["Lanka eNews", "https://www.lankaenews.com/", "list"],
];

function stripHtml(raw) {
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function xmlTagInner(block, tag) {
  const escaped = tag.replace(":", "\\:");
  const m = block.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return m?.[1] || "";
}

function extractOg(html, pageUrl) {
  const patterns = [
    /property=["']og:image[^"']*["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image/i,
    /name=["']twitter:image[^"']*["'][^>]*content=["']([^"']+)["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return new URL(m[1], pageUrl).href;
  }
  return "";
}

function firstImg(html, pageUrl) {
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const src = m[1];
    if (!src || /logo|icon|avatar|1x1|pixel/i.test(src)) continue;
    if (/\.(jpe?g|png|webp|gif)/i.test(src)) return new URL(src, pageUrl).href;
  }
  return "";
}

async function probeRss(url, limit = 3) {
  const xml = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
  const chunks = xml.split(/<item[\s>]/i).slice(1, limit + 1);
  const out = [];
  for (const chunk of chunks) {
    const title = stripHtml(xmlTagInner(chunk, "title")).slice(0, 55);
    const link = stripHtml(xmlTagInner(chunk, "link") || xmlTagInner(chunk, "guid"));
    const imgs = [];
    for (const m of chunk.matchAll(/url=["']([^"']+)["']/gi)) imgs.push(m[1]);
    for (const m of chunk.matchAll(/src=["']([^"']+)["']/gi)) {
      if (/\.(jpe?g|png|webp)/i.test(m[1])) imgs.push(m[1]);
    }
    out.push({ title, link, rssImgs: imgs.slice(0, 3) });
  }
  return out;
}

async function probeList(url, limit = 3) {
  const html = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
  const links = [];
  for (const m of html.matchAll(/href=["']\/news\/(\d+)\/en["']/gi)) {
    links.push(`https://www.lankaenews.com/news/${m[1]}/si`);
    if (links.length >= limit) break;
  }
  return links.map((link) => ({ title: "", link, rssImgs: [] }));
}

async function probePage(link) {
  try {
    const res = await fetch(link, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const og = extractOg(html, link);
    const img = firstImg(html, link);
    const title = stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").slice(0, 55);
    return { title, og, img };
  } catch (e) {
    return { error: e.message };
  }
}

for (const [name, url, type] of sources) {
  console.log(`\n=== ${name} ===`);
  const items = type === "rss" ? await probeRss(url) : await probeList(url);
  for (const item of items) {
    const page = await probePage(item.link);
    console.log(`\n${page.title || item.title}`);
    console.log(`  link: ${item.link}`);
    console.log(`  rss: ${item.rssImgs.join(" | ") || "(none)"}`);
    console.log(`  og:  ${page.og || "(none)"}`);
    console.log(`  img: ${page.img || "(none)"}`);
    if (page.error) console.log(`  err: ${page.error}`);
  }
}
