const slug = "news-ms2n42ml";
const t = await fetch(`https://fmheart-tau.vercel.app/news/${slug}`, {
  headers: { "User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache" },
}).then((r) => r.text());

const covers = [
  ...t.matchAll(
    /(?:src|content)="(https:\/\/[^"]+\.(?:jpe?g|png|webp)|\/logo\/[^"]+)"/gi,
  ),
].map((m) => m[1]);
console.log({
  statusImgs: [...new Set(covers)].slice(0, 12),
  hasPlaceholder: t.includes("fmheart-cover"),
  title: (t.match(/<h1[^>]*>([^<]+)/) || [])[1]?.slice(0, 80),
});
