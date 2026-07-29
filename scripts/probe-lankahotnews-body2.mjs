const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";
const link = "https://www.lankahotnews.net/2026/07/dew-nuwara-asala-perahera.html";
const html = await (await fetch(link, { headers: { "User-Agent": UA } })).text();

for (const cls of ["entry-content", "post-body", "post-body entry-content", "article-content", "blog-post"]) {
  const re = new RegExp(`<div[^>]+class=["'][^"']*\\b${cls.split(" ")[0]}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`, "i");
  const m = html.match(re);
  console.log(cls, m?.[1]?.length, m?.[1]?.slice(0, 200).replace(/\s+/g, " "));
}

// RSS content:encoded
const feed = await (await fetch("https://www.lankahotnews.net/rss.xml", { headers: { "User-Agent": UA } })).text();
const encoded = feed.split(/<item[\s>]/i)[1].match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i)?.[1];
console.log("\nRSS content:encoded len", encoded?.length);
console.log("encoded preview", encoded?.slice(0, 300));
