const r = await fetch("https://fmheart.lk/", {
  headers: { "User-Agent": "Mozilla/5.0" },
  redirect: "follow",
});
const t = await r.text();
console.log({
  status: r.status,
  final: r.url,
  len: t.length,
  title: t.match(/<title[^>]*>([^<]+)/i)?.[1],
  hasNews: t.includes("නවතම"),
  hasCover: t.includes("fmheart-cover"),
  hasNeth: t.includes("nethnews"),
  snippet: t.replace(/\s+/g, " ").slice(0, 300),
});
