const urls = [
  "https://fmheart.lk/",
  "https://www.fmheart.lk/",
  "https://fmheart-tau.vercel.app/",
];

for (const u of urls) {
  try {
    const r = await fetch(u, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "FMHeartNewsBot/1.0" },
    });
    const t = await r.text();
    const fb = (t.match(/fmheart-cover\.png/g) || []).length;
    const neth = (t.match(/nethnews\.lk\/wp-content/g) || []).length;
    const hasBar = t.includes("බර ඉසිලීමේ");
    console.log(
      JSON.stringify({
        u,
        status: r.status,
        final: r.url,
        fb,
        neth,
        hasBar,
      }),
    );
  } catch (e) {
    console.log(u, e.message);
  }
}
