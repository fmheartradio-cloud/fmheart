const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";
const feed = await (await fetch("https://www.lankahotnews.net/rss.xml", { headers: { "User-Agent": UA } })).text();
const item = feed.split(/<item[\s>]/i)[1];
for (const tag of ["description", "content:encoded", "summary"]) {
  const m = item.match(new RegExp(`<${tag.replace(":", "\\:")}>([\\s\\S]*?)<\\/${tag.replace(":", "\\:")}>`, "i"));
  console.log(tag, "len", m?.[1]?.length, "preview", m?.[1]?.slice(0, 250));
}

const link = item.match(/<link>([^<]+)<\/link>/i)?.[1];
const html = await (await fetch(link, { headers: { "User-Agent": UA } })).text();
const idx = html.indexOf("දෙවිනුවර");
console.log("sinhala idx", idx);
if (idx > 0) console.log("context", html.slice(idx - 200, idx + 400).replace(/\s+/g, " "));
