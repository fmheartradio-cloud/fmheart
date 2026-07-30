import { SITE } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Allow long-lived radio passthrough (Pro/Enterprise; Hobby may cut earlier). */
export const maxDuration = 300;

/**
 * Same-origin Icecast proxy for Web Audio AnalyserNode only.
 * Do NOT use for long listening — Vercel maxDuration cuts the stream (~5 min).
 * Primary playback uses SITE.streamUrl directly from the browser.
 */
export async function GET() {
  try {
    const upstream = await fetch(SITE.streamUrl, {
      headers: {
        "User-Agent": "FMHeartWeb/1.0 (+https://fmheart.lk)",
        Accept: "*/*",
      },
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return new Response("Upstream stream unavailable", { status: 502 });
    }

    const contentType =
      upstream.headers.get("content-type") || "audio/mpeg";

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Transfer-Encoding": "chunked",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response("Stream proxy error", { status: 502 });
  }
}
