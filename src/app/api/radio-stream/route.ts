import { SITE } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Allow long-lived radio passthrough (Pro/Enterprise; Hobby may cut earlier). */
export const maxDuration = 300;

/**
 * Same-origin Icecast proxy. Non-Apple browsers play *through* this so the
 * AnalyserNode reads the exact samples the listener hears (FFT stays in sync).
 * maxDuration cuts each connection near 5 min — the client crossfades to a
 * second connection before that, and Apple/WebKit plays SITE.streamUrl direct.
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
