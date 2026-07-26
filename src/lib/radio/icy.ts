import https from "node:https";
import http from "node:http";
import { SITE } from "@/lib/site";

export type NowPlayingTrack = {
  song: string;
  artist: string;
  raw: string;
};

/** Split Icecast StreamTitle into artist + song when possible. */
export function parseStreamTitle(raw: string): NowPlayingTrack {
  const title = raw.trim().replace(/\0+$/g, "");
  if (!title) {
    return { song: "FM Heart Live", artist: "On Air", raw: "" };
  }

  const parts = title.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    const artist = parts[0]!.trim();
    const song = parts.slice(1).join(" - ").trim();
    if (artist && song) return { song, artist, raw: title };
  }

  return { song: title, artist: "FM Heart", raw: title };
}

/**
 * Read one ICY metadata block from the live stream (server-side only).
 * Uses Node http(s) so we can destroy the socket immediately after the first
 * metadata frame — fetch()/ReadableStream often leaves Icecast connections open.
 */
export async function fetchIcyNowPlaying(
  streamUrl = SITE.streamUrl,
): Promise<NowPlayingTrack | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value: NowPlayingTrack | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    let url: URL;
    try {
      url = new URL(streamUrl);
    } catch {
      done(null);
      return;
    }

    const lib = url.protocol === "http:" ? http : https;
    const req = lib.request(
      url,
      {
        method: "GET",
        headers: {
          "Icy-MetaData": "1",
          "User-Agent": "FMHeartWeb/1.0 (+https://fmheart.lk)",
          Connection: "close",
        },
      },
      (res) => {
        if ((res.statusCode ?? 0) >= 400) {
          res.resume();
          req.destroy();
          done(null);
          return;
        }

        const metaint = Number(res.headers["icy-metaint"] || 0);
        const chunks: Buffer[] = [];
        let total = 0;
        const maxBytes = metaint > 0 ? metaint + 1 + 4096 : 48_000;

        const finish = () => {
          const buf = Buffer.concat(chunks, total);
          req.destroy();
          res.destroy();

          if (metaint > 0 && buf.length > metaint) {
            const metaLen = buf[metaint]! * 16;
            if (metaLen > 0) {
              const metaEnd = Math.min(buf.length, metaint + 1 + metaLen);
              const meta = buf
                .subarray(metaint + 1, metaEnd)
                .toString("utf8")
                .replace(/\0+$/g, "");
              const match = meta.match(/StreamTitle='([^']*)'/i);
              if (match?.[1]) {
                done(parseStreamTitle(match[1]));
                return;
              }
            }
          }

          const scanned = scanStreamTitle(buf);
          done(scanned ? parseStreamTitle(scanned) : null);
        };

        res.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
          total += chunk.length;
          if (total >= maxBytes) finish();
        });
        res.on("end", finish);
        res.on("error", () => done(null));
      },
    );

    const timer = setTimeout(() => {
      req.destroy();
      done(null);
    }, 10_000);

    req.on("error", () => done(null));
    req.end();
  });
}

function scanStreamTitle(buf: Buffer): string | null {
  const text = buf.toString("latin1");
  const match = text.match(/StreamTitle='([^']*)'/i);
  return match?.[1] ?? null;
}
