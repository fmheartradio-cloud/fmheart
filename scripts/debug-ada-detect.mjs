import sharp from "sharp";

const urls = [
  // Will fill from news page
];

const t = await fetch("https://fmheart-tau.vercel.app/news", {
  headers: { "User-Agent": "FMHeartNewsBot/1.0" },
}).then((r) => r.text());

const found = [
  ...t.matchAll(
    /https:\\\/\\\/s3\.amazonaws\.com\\\/adaderanasinhala\\\/[^"\\]+/g,
  ),
].map((m) => m[0].replace(/\\+/g, ""));
const found2 = [
  ...t.matchAll(
    /https:\/\/s3\.amazonaws\.com\/adaderanasinhala\/[^"\\\s]+/g,
  ),
].map((m) => m[0]);
const all = [...new Set([...found, ...found2])].filter((u) =>
  /\.(jpe?g|png)/i.test(u),
);

console.log("ada covers on /news:", all.length);

function isRedBorderPixel(r, g, b) {
  return r > 105 && r > g * 1.25 && r > b * 1.1 && g < 145 && b < 145;
}

async function redRatio(buf, left, top, width, height) {
  const { data, info } = await sharp(buf)
    .extract({ left, top, width, height })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let red = 0;
  const step = info.channels;
  for (let i = 0; i < data.length; i += step) {
    if (isRedBorderPixel(data[i], data[i + 1], data[i + 2])) red += 1;
  }
  return red / (info.width * info.height);
}

for (const url of all.slice(0, 5)) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "FMHeartNewsBot/1.0",
      Referer: "https://sinhala.adaderana.lk/",
    },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const resized = await sharp(buf)
    .rotate()
    .resize({ width: 720, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  const meta = await sharp(resized).metadata();
  const w = meta.width;
  const h = meta.height;
  const rw = Math.max(24, Math.floor(w * 0.42));
  const rh = Math.max(20, Math.floor(h * 0.3));
  const bl = await redRatio(resized, 0, h - rh, rw, rh);
  const br = await redRatio(resized, w - rw, h - rh, rw, rh);
  const tl = await redRatio(resized, 0, 0, rw, rh);
  const cornerHit = bl >= 0.055 && bl >= br * 1.1 && bl >= tl * 0.95;
  const bottomHit = Math.max(bl, br) >= 0.09 && Math.max(bl, br) >= tl * 1.2;
  console.log({
    file: url.split("/").pop(),
    bl: +bl.toFixed(4),
    br: +br.toFixed(4),
    tl: +tl.toFixed(4),
    cornerHit,
    bottomHit,
    detected: cornerHit || bottomHit,
  });
}
