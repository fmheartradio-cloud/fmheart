import sharp from "sharp";

const FETCH_TIMEOUT_MS = 12000;
const MAX_ANALYZE_WIDTH = 720;

/** Ada Derana burns a 3-language boxed logo (usually bottom-left). */
function isAdaFamilyCoverUrl(url: string): boolean {
  return /adaderanasinhala|cdn\.ada\.lk|adaderana\.lk/i.test(url);
}

function isRedBorderPixel(r: number, g: number, b: number): boolean {
  // Maroon / pink-red outline of the ADA|අද|அத boxes
  return r > 105 && r > g * 1.25 && r > b * 1.1 && g < 145 && b < 145;
}

async function redRatioInRegion(
  input: Buffer,
  left: number,
  top: number,
  width: number,
  height: number,
): Promise<number> {
  const { data, info } = await sharp(input)
    .extract({ left, top, width, height })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let red = 0;
  const total = info.width * info.height;
  const step = info.channels;
  for (let i = 0; i < data.length; i += step) {
    if (isRedBorderPixel(data[i], data[i + 1], data[i + 2])) red += 1;
  }
  return total > 0 ? red / total : 0;
}

/**
 * Heuristic detector for Ada Derana's burnt-in corner watermark.
 * Returns true when the cover almost certainly has the ADA/අද/அத stamp.
 */
export async function detectAdaDeranaWatermark(
  image: Buffer,
): Promise<boolean> {
  if (!image?.length) return false;

  const resized = await sharp(image)
    .rotate()
    .resize({
      width: MAX_ANALYZE_WIDTH,
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  const meta = await sharp(resized).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (w < 80 || h < 80) return false;

  const rw = Math.max(24, Math.floor(w * 0.42));
  const rh = Math.max(20, Math.floor(h * 0.3));

  const [bl, br, tl] = await Promise.all([
    redRatioInRegion(resized, 0, h - rh, rw, rh),
    redRatioInRegion(resized, w - rw, h - rh, rw, rh),
    redRatioInRegion(resized, 0, 0, rw, rh),
  ]);

  // Watermark sits bottom-left more often than other corners.
  const cornerHit =
    bl >= 0.055 && bl >= br * 1.1 && bl >= tl * 0.95;

  // Sometimes centered along bottom — accept high red in either bottom corner.
  const bottomHit = Math.max(bl, br) >= 0.09 && Math.max(bl, br) >= tl * 1.2;

  return cornerHit || bottomHit;
}

export async function fetchCoverHasAdaDeranaWatermark(
  coverUrl: string,
): Promise<boolean> {
  const url = coverUrl.trim();
  if (!url || !isAdaFamilyCoverUrl(url)) return false;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "FMHeartNewsBot/1.0 (+https://fmheart.lk)",
        Accept: "image/*,*/*;q=0.8",
        Referer: "https://sinhala.adaderana.lk/",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 800) return false;
    return detectAdaDeranaWatermark(buf);
  } catch {
    return false;
  }
}

/**
 * True when this Ada (or Ada-family) cover should cause the article to be skipped.
 * Ada Derana burns ADA/අද දෙරණ into nearly every CDN still — treat all Ada-family
 * cover URLs as watermarked (pixel heuristics miss many of them).
 */
export async function shouldSkipNewsForCoverWatermark(
  coverUrl: string,
  sourceUrl = "",
): Promise<boolean> {
  const combined = `${coverUrl} ${sourceUrl}`;
  if (!/adaderana|adaderanasinhala|cdn\.ada\.lk/i.test(combined)) {
    return false;
  }
  if (!coverUrl.trim()) return false;
  // Hard rule: Ada CDN / S3 stills always carry the brand stamp.
  if (isAdaFamilyCoverUrl(coverUrl)) return true;
  // Non-CDN cover on an Ada article — fall back to pixel detect.
  return fetchCoverHasAdaDeranaWatermark(coverUrl);
}

function isNethCoverUrl(url: string): boolean {
  return /nethnews\.lk\/wp-content\/uploads/i.test(url);
}

function regionChannelStats(
  data: Buffer,
  width: number,
  channels: number,
  left: number,
  top: number,
  rw: number,
  rh: number,
): { darkRatio: number; brightRatio: number; redRatio: number } {
  let dark = 0;
  let red = 0;
  let bright = 0;
  let n = 0;
  for (let y = top; y < top + rh; y += 1) {
    for (let x = left; x < left + rw; x += 1) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (r + g + b) / 3;
      if (lum < 50) dark += 1;
      if (lum > 210) bright += 1;
      if (r > 140 && r > g * 1.35 && r > b * 1.35) red += 1;
      n += 1;
    }
  }
  return {
    darkRatio: n ? dark / n : 0,
    brightRatio: n ? bright / n : 0,
    redRatio: n ? red / n : 0,
  };
}

/**
 * Detect Neth News designed video posters (NET NEWS badge + graphic text overlays).
 * These are WP-hosted JPGs, not ytimg URLs, so URL filters miss them.
 */
export async function detectNethDesignedVideoPoster(
  image: Buffer,
): Promise<boolean> {
  if (!image?.length) return false;

  const { data, info } = await sharp(image)
    .rotate()
    .resize({
      width: MAX_ANALYZE_WIDTH,
      withoutEnlargement: true,
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width || 0;
  const h = info.height || 0;
  const ch = info.channels || 3;
  if (w < 80 || h < 80) return false;

  const tr = regionChannelStats(
    data,
    w,
    ch,
    Math.floor(w * 0.68),
    0,
    Math.floor(w * 0.3),
    Math.floor(h * 0.2),
  );
  const lower = regionChannelStats(
    data,
    w,
    ch,
    Math.floor(w * 0.05),
    Math.floor(h * 0.55),
    Math.floor(w * 0.9),
    Math.floor(h * 0.4),
  );
  const brTiny = regionChannelStats(
    data,
    w,
    ch,
    Math.floor(w * 0.82),
    Math.floor(h * 0.86),
    Math.floor(w * 0.16),
    Math.floor(h * 0.12),
  );

  const netNewsBadge = tr.redRatio >= 0.1;
  const lowerGraphicText = lower.redRatio >= 0.12 && lower.brightRatio >= 0.08;
  const durationPill = brTiny.darkRatio >= 0.25 && brTiny.brightRatio >= 0.03;

  return (
    (netNewsBadge && lowerGraphicText) ||
    (netNewsBadge && durationPill) ||
    (lowerGraphicText && durationPill)
  );
}

export async function fetchCoverIsNethDesignedVideoPoster(
  coverUrl: string,
): Promise<boolean> {
  const url = coverUrl.trim();
  if (!url || !isNethCoverUrl(url)) return false;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "FMHeartNewsBot/1.0 (+https://fmheart.lk)",
        Accept: "image/*,*/*;q=0.8",
        Referer: "https://www.nethnews.lk/",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 800) return false;
    return detectNethDesignedVideoPoster(buf);
  } catch {
    return false;
  }
}

/** Clear Neth designed video-poster covers; keep normal photos. */
export async function shouldClearNethVideoPosterCover(
  coverUrl: string,
  sourceUrl = "",
): Promise<boolean> {
  const combined = `${coverUrl} ${sourceUrl}`;
  if (!/nethnews/i.test(combined)) return false;
  if (!coverUrl.trim()) return false;
  if (isLikelyVideoThumbnailUrlFast(coverUrl)) return true;
  return fetchCoverIsNethDesignedVideoPoster(coverUrl);
}

function isLikelyVideoThumbnailUrlFast(url: string): boolean {
  return /(?:ytimg|youtube|youtubei|vimeocdn|dailymotion|jwplayer|maxresdefault|hqdefault|mqdefault|sddefault|video[-_/]?thumb|thumbnail[-_/]?video|poster[-_/]?frame|play[-_/]?overlay|embed[-_/]?thumb)/i.test(
    url,
  );
}
