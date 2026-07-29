const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";
const feed = await (await fetch("https://www.lankahotnews.net/rss.xml", { headers: { "User-Agent": UA } })).text();
const item = feed.split(/<item[\s>]/i)[1];
const desc = item.match(/<description>([\s\S]*?)<\/description>/i)?.[1];
const img = desc?.match(/src=["']([^"']+)["']/i)?.[1];
console.log("desc img", img);

const link = item.match(/<link>([^<]+)<\/link>/i)?.[1];
const html = await (await fetch(link, { headers: { "User-Agent": UA } })).text();
const og = html.match(/property=['"]og:image['"][^>]*content=['"]([^'"]+)['"]/i)?.[1]
  || html.match(/content=['"]([^'"]+)['"][^>]*property=['"]og:image['"]/i)?.[1];
console.log("og:image", og);

// Look for main article div - blogger often uses div.post-body with nested content
const postBodyMatch = html.match(/<div class=['"]post-body entry-content['"][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
console.log("post-body block", postBodyMatch?.[1]?.length);
if (postBodyMatch) {
  const text = postBodyMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  console.log("text preview", text.slice(0, 300));
}
