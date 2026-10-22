import { parseStreamTitle, type NowPlayingTrack } from "@/lib/radio/icy";
import { SITE } from "@/lib/site";

export type IcecastMount = {
  listeners: number;
  peak: number;
  bitrate: number;
  title: string;
  listenurl: string;
  streamStart: string | null;
  dummy: boolean;
};

export type IcecastLive = {
  live: boolean;
  listeners: number;
  peak: number;
  bitrate: number;
  track: NowPlayingTrack;
  streamStart: string | null;
  listenurl: string;
  serverName: string;
};

type IcecastSource = {
  listeners?: number;
  listener_peak?: number;
  bitrate?: number;
  title?: string;
  yp_currently_playing?: string;
  listenurl?: string;
  stream_start_iso8601?: string;
  stream_start?: string;
  server_name?: string;
  dummy?: unknown;
};

const CACHE_MS = 8_000;
let cache: { at: number; data: IcecastLive | null } | null = null;

export function icecastStatusUrl(): string {
  const override = process.env.ICECAST_STATUS_URL?.trim();
  if (override) return override;
  try {
    const u = new URL(SITE.streamUrl);
    const base = u.pathname.replace(/\/stream\/?$/i, "");
    return `${u.origin}${base}/status-json.xsl`;
  } catch {
    return "";
  }
}

function asSource(raw: IcecastSource): IcecastMount {
  const title = String(raw.title || raw.yp_currently_playing || "").trim();
  return {
    listeners: Number(raw.listeners) || 0,
    peak: Number(raw.listener_peak) || 0,
    bitrate: Number(raw.bitrate) || 0,
    title,
    listenurl: String(raw.listenurl || ""),
    streamStart: raw.stream_start_iso8601 || raw.stream_start || null,
    dummy: raw.dummy != null && raw.dummy !== false,
  };
}

function pickMount(sources: IcecastMount[]): IcecastMount | null {
  const real = sources.filter(
    (s) => !s.dummy && (s.listeners > 0 || s.title || /autodj/i.test(s.listenurl)),
  );
  const ranked = (real.length ? real : sources.filter((s) => !s.dummy)).sort(
    (a, b) => b.listeners - a.listeners || b.peak - a.peak,
  );
  return ranked[0] || null;
}

export async function fetchIcecastLive(
  force = false,
): Promise<IcecastLive | null> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.data;

  const url = icecastStatusUrl();
  if (!url) {
    cache = { at: Date.now(), data: null };
    return null;
  }

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "FMHeartCMS/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      cache = { at: Date.now(), data: null };
      return null;
    }
    const json = (await res.json()) as {
      icestats?: { source?: IcecastSource | IcecastSource[]; host?: string };
    };
    const source = json.icestats?.source;
    const list = Array.isArray(source) ? source : source ? [source] : [];
    const mount = pickMount(list.map(asSource));
    if (!mount) {
      cache = { at: Date.now(), data: null };
      return null;
    }

    const track = mount.title
      ? parseStreamTitle(mount.title.replace(/^FMHEART\s*[-–—]\s*/i, ""))
      : { song: "FM Heart Live", artist: "On Air", raw: mount.title };

    const data: IcecastLive = {
      live: mount.listeners > 0 || Boolean(mount.title),
      listeners: mount.listeners,
      peak: mount.peak,
      bitrate: mount.bitrate,
      track,
      streamStart: mount.streamStart,
      listenurl: mount.listenurl,
      serverName: "FM Heart Stream",
    };
    cache = { at: Date.now(), data };
    return data;
  } catch {
    cache = { at: Date.now(), data: null };
    return null;
  }
}
