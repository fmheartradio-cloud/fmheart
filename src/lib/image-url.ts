const BLOGGER_SIZE_RE = /\/s(\d+)(-[a-z0-9-]+)?\//i;
const BLOGGER_DIM_RE = /\/w(\d+)-h(\d+)(-[a-z0-9-]+)?\//i;

function isBloggerCdn(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.includes("googleusercontent.com") ||
    h.includes("bp.blogspot.com") ||
    h.includes("blogspot.com")
  );
}

/** True when URL path/query hints at a thumbnail-sized image. */
export function isLikelySmallImageUrl(url: string): boolean {
  if (!url) return false;

  const sizeMatch = url.match(BLOGGER_SIZE_RE);
  if (sizeMatch) return Number(sizeMatch[1]) < 400;

  const dimMatch = url.match(BLOGGER_DIM_RE);
  if (dimMatch) {
    return Number(dimMatch[1]) < 400 || Number(dimMatch[2]) < 400;
  }

  try {
    const u = new URL(url);
    const width = Number(u.searchParams.get("w") || u.searchParams.get("width") || 0);
    const height = Number(u.searchParams.get("h") || u.searchParams.get("height") || 0);
    if (width > 0 && width < 400) return true;
    if (height > 0 && height < 400) return true;
  } catch {
    /* ignore invalid URL */
  }

  return false;
}

/** Rewrite known CDN thumbnail URLs to larger variants (URL-only, no download). */
export function upgradeImageUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  try {
    const u = new URL(trimmed);
    if (!isBloggerCdn(u.hostname)) return trimmed;

    let path = u.pathname;
    path = path.replace(BLOGGER_SIZE_RE, (_match, size, suffix = "") => {
      if (Number(size) >= 800) return _match;
      return `/s1600${suffix}/`;
    });
    path = path.replace(BLOGGER_DIM_RE, (_match, w, h, suffix = "") => {
      if (Number(w) >= 800 && Number(h) >= 400) return _match;
      return `/w1600-h1200${suffix}/`;
    });
    u.pathname = path;
    return u.href;
  } catch {
    return trimmed;
  }
}

/** Pick the best cover from candidates, preferring upgraded non-thumbnail URLs. */
export function pickBestCoverUrl(...candidates: (string | undefined)[]): string {
  const urls = candidates
    .map((u) => (u ? upgradeImageUrl(u.trim()) : ""))
    .filter(Boolean);
  if (!urls.length) return "";
  return urls.find((u) => !isLikelySmallImageUrl(u)) || urls[0];
}
