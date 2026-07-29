const t = await fetch("https://fmheart-tau.vercel.app/news", {
  headers: { "User-Agent": "FMHeartNewsBot/1.0", "Cache-Control": "no-cache" },
}).then((r) => r.text());

const ada = [
  ...t.matchAll(
    /https:\/\/(?:s3\.amazonaws\.com\/adaderanasinhala|[^"'\s]*ada[^"'\s]*)[^"'\s]*/gi,
  ),
].map((m) => m[0]);
const adaEsc = [
  ...t.matchAll(
    /https:\\\/\\\/s3\.amazonaws\.com\\\/adaderanasinhala\\\/[^"\\]+/g,
  ),
].map((m) => m[0].replace(/\\+/g, ""));

const all = [...new Set([...ada, ...adaEsc])].filter((u) =>
  /\.(jpe?g|png|webp)/i.test(u),
);
console.log(
  JSON.stringify(
    {
      count: all.length,
      samples: all.slice(0, 12).map((u) => u.slice(0, 120)),
    },
    null,
    2,
  ),
);

// Also probe one live cover for detector
if (all[0]) {
  const { detectAdaDeranaWatermark } = await import(
    "../src/lib/newsbot/watermark-detect.ts"
  ).catch(() => ({ detectAdaDeranaWatermark: null }));
  const buf = Buffer.from(
    await fetch(all[0], {
      headers: {
        "User-Agent": "FMHeartNewsBot/1.0",
        Referer: "https://sinhala.adaderana.lk/",
      },
    }).then((r) => r.arrayBuffer()),
  );
  console.log("probe bytes", buf.length, "url", all[0].slice(0, 100));
}
