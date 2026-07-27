const BLOGGER_SIZE_RE = /\/s(\d+)(-[a-z0-9-]+)?\//i;
const BLOGGER_DIM_RE = /\/w(\d+)-h(\d+)(-[a-z0-9-]+)?\//i;
const WP_SIZE_SUFFIX_RE = /-\d+x\d+(?=\.(jpe?g|png|webp|gif|avif)(?:[?#]|$))/i;
const BBC_WS_RE = /\/ace\/ws\/(\d+)\//i;
const BBC_STANDARD_RE = /\/ace\/standard\/(\d+)\//i;
const BBC_NEWS_RE = /\/news\/(\d+)\//i;
const ADA_DERANA_SMALL_RE =
  /(?:_S|_M|_t|-\d{2,3})\.(jpe?g|png|webp|gif|avif)(?:[?#]|$)/i;
const THUMB_PATH_RE =
  /(?:^|[/_-])(thumb(?:nail)?s?|small|mini|icon|logo|avatar|sprite|brand)(?:[/_-]|\.)/i;

const MIN_COVER_WIDTH = 600;

function isBloggerCdn(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.includes("googleusercontent.com") ||
    h.includes("bp.blogspot.com") ||
    h.includes("blogspot.com")
  );
}

function isAdaDeranaCdn(host: string, path: string): boolean {
  const h = host.toLowerCase();
  return h.includes("adaderanasinhala") || /adaderana/i.test(path);
}

function parseIntSafe(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Estimate pixel width from URL heuristics (URL-only, no download). */
export function estimateImageWidth(url: string): number {
  if (!url) return 0;

  const bloggerSize = url.match(BLOGGER_SIZE_RE);
  if (bloggerSize) return parseIntSafe(bloggerSize[1]);

  const bloggerDim = url.match(BLOGGER_DIM_RE);
  if (bloggerDim) {
    return Math.max(parseIntSafe(bloggerDim[1]), parseIntSafe(bloggerDim[2]));
  }

  for (const re of [BBC_WS_RE, BBC_STANDARD_RE, BBC_NEWS_RE]) {
    const match = url.match(re);
    if (match) return parseIntSafe(match[1]);
  }

  const wpSize = url.match(/-(\d+)x(\d+)\.(jpe?g|png|webp|gif|avif)/i);
  if (wpSize) {
    return Math.max(parseIntSafe(wpSize[1]), parseIntSafe(wpSize[2]));
  }

  const adaNum = url.match(/-(\d{2,3})\.(jpe?g|png|webp|gif|avif)(?:[?#]|$)/i);
  if (adaNum) return parseIntSafe(adaNum[1]);

  if (/_T\.(jpe?g|png|webp|gif|avif)/i.test(url)) return 120;
  if (/_S\.(jpe?g|png|webp|gif|avif)/i.test(url)) return 200;
  if (/_M\.(jpe?g|png|webp|gif|avif)/i.test(url)) return 350;
  if (/_t\.(jpe?g|png|webp|gif|avif)/i.test(url)) return 150;

  try {
    const u = new URL(url);
    const width = Number(
      u.searchParams.get("w") ||
        u.searchParams.get("width") ||
        u.searchParams.get("resize") ||
        0,
    );
    const height = Number(u.searchParams.get("h") || u.searchParams.get("height") || 0);
    if (width > 0 || height > 0) {
      return Math.max(width, height);
    }
  } catch {
    /* ignore invalid URL */
  }

  return 0;
}

/** True when URL path/query hints at a thumbnail-sized image. */
export function isLikelySmallImageUrl(url: string): boolean {
  if (!url) return false;

  if (THUMB_PATH_RE.test(url)) return true;
  if (/_T\.(jpe?g|png|webp|gif|avif)/i.test(url)) return true;
  if (/_S\.(jpe?g|png|webp|gif|avif)/i.test(url)) return true;
  if (/_t\.(jpe?g|png|webp|gif|avif)/i.test(url)) return true;
  if (/-\d{2,3}\.(jpe?g|png|webp|gif|avif)(?:[?#]|$)/i.test(url)) return true;
  if (/[?&](resize|fit|crop|thumb)=/i.test(url)) return true;

  const width = estimateImageWidth(url);
  return width > 0 && width < 400;
}

/** True when we should fetch the article page for a higher-quality cover. */
export function needsHigherQualityCover(url: string): boolean {
  if (!url.trim()) return true;
  if (isLikelyJunkCoverUrl(url) || isLikelySmallImageUrl(url)) return true;
  if (ADA_DERANA_SMALL_RE.test(url)) return true;
  if (/\/s\d+-w\d+-h\d+/i.test(url)) return true;

  const width = estimateImageWidth(url);
  if (width > 0 && width < MIN_COVER_WIDTH) return true;

  return false;
}

/** Skip icons, logos, and tracking pixels as article covers. */
export function isLikelyJunkCoverUrl(url: string): boolean {
  if (!url) return true;
  return /logo|icon|avatar|pixel|spacer|1x1|tracking|badge|sprite|advertising\.gif|brand\.jpg|gel\/brand|pix\.png|lanka-e-news-log|new-year-\d{4}/i.test(
    url,
  );
}

function upgradeAdaDeranaPath(path: string): string {
  return path
    .replace(/_S\.(jpe?g|png|webp|gif|avif)$/i, "_L.$1")
    .replace(/_M\.(jpe?g|png|webp|gif|avif)$/i, "_L.$1")
    .replace(/_t\.(jpe?g|png|webp|gif|avif)$/i, "_L.$1")
    .replace(/-150\.(jpe?g|png|webp|gif|avif)$/i, "-350.$1")
    .replace(
      /-(\d{2,3})\.(jpe?g|png|webp|gif|avif)$/i,
      (match, size: string, ext: string) =>
        Number(size) < 400 ? `-350.${ext}` : match,
    );
}

function upgradeBloggerPath(path: string): string {
  let next = path;
  next = next.replace(BLOGGER_SIZE_RE, (_match, size, suffix = "") => {
    if (Number(size) >= 800) return _match;
    return `/s1600${suffix}/`;
  });
  next = next.replace(BLOGGER_DIM_RE, (_match, w, h, suffix = "") => {
    if (Number(w) >= 800 && Number(h) >= 400) return _match;
    return `/w1600-h1200${suffix}/`;
  });
  return next;
}

function upgradeGenericPath(path: string, host: string): string {
  let next = path.replace(WP_SIZE_SUFFIX_RE, "");
  next = upgradeAdaDeranaPath(next);
  next = next.replace(BBC_WS_RE, (_match, width) =>
    Number(width) >= 800 ? _match : "/ace/ws/976/",
  );
  next = next.replace(BBC_STANDARD_RE, (_match, width) =>
    Number(width) >= 800 ? _match : "/ace/standard/976/",
  );
  next = next.replace(BBC_NEWS_RE, (_match, width) =>
    Number(width) >= 800 ? _match : "/news/1200/",
  );
  if (isAdaDeranaCdn(host, next)) {
    next = upgradeAdaDeranaPath(next);
  }
  return next;
}

function stripRestrictiveImageQuery(u: URL): void {
  for (const key of ["w", "h", "width", "height", "resize", "fit", "crop", "thumb"]) {
    u.searchParams.delete(key);
  }
}

/** Rewrite known CDN thumbnail URLs to larger variants (URL-only, no download). */
export function upgradeImageUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  try {
    const u = new URL(trimmed);
    let path = u.pathname;

    if (isBloggerCdn(u.hostname)) {
      path = upgradeBloggerPath(path);
    } else {
      path = upgradeGenericPath(path, u.hostname);
    }

    u.pathname = path;
    stripRestrictiveImageQuery(u);
    return u.href;
  } catch {
    return trimmed;
  }
}

/** Final cover URL for Firestore + display — upgrade and drop junk. */
export function finalizeCoverUrl(url: string): string {
  const upgraded = upgradeImageUrl(url);
  if (!upgraded || isLikelyJunkCoverUrl(upgraded)) return "";
  return upgraded;
}

/** Pick the best cover from candidates, preferring upgraded non-thumbnail URLs. */
export function pickBestCoverUrl(...candidates: (string | undefined)[]): string {
  const scored = candidates
    .map((candidate) => {
      if (!candidate?.trim()) return null;
      const upgraded = upgradeImageUrl(candidate.trim());
      if (!upgraded || isLikelyJunkCoverUrl(upgraded)) return null;
      return {
        url: upgraded,
        width: estimateImageWidth(upgraded),
        small: isLikelySmallImageUrl(upgraded),
      };
    })
    .filter(Boolean) as Array<{ url: string; width: number; small: boolean }>;

  if (!scored.length) return "";

  scored.sort((a, b) => {
    if (a.small !== b.small) return a.small ? 1 : -1;
    return b.width - a.width;
  });

  return scored[0].url;
}
