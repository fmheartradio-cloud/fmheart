/**
 * FM Heart — Icecast CORS proxy on Cloudflare Workers (zero egress fees).
 *
 * Why: Real FFT needs a CORS-enabled stream. Vercel /api/radio-stream works but
 * bills bandwidth. Cloudflare Workers do not charge egress.
 *
 * Deploy (one-time):
 *   1. npm i -g wrangler   (or use npx)
 *   2. cd cloudflare && npx wrangler login
 *   3. npx wrangler deploy
 *   4. Copy the worker URL into Vercel env:
 *        NEXT_PUBLIC_STREAM_PROXY_URL=https://fmheart-radio-proxy.<your-subdomain>.workers.dev
 *   5. Redeploy the Next.js site
 *
 * Emergency cost cut without CF: set NEXT_PUBLIC_REALTIME_SPECTRUM=false
 * (direct Icecast + simulated bars, $0 proxy bandwidth).
 */

const UPSTREAM = "https://cast3.my-control-panel.com/proxy/fmheartn/stream";

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // Health / warm ping — no upstream bytes
    const url = new URL(request.url);
    if (url.searchParams.has("warm") || url.pathname.endsWith("/health")) {
      return new Response("ok", {
        status: 200,
        headers: { ...corsHeaders(), "Content-Type": "text/plain" },
      });
    }

    try {
      const upstream = await fetch(UPSTREAM, {
        headers: {
          "User-Agent": "FMHeartCFProxy/1.0 (+https://fmheart.lk)",
          Accept: "*/*",
          // Forward Range if present (some players probe)
          ...(request.headers.get("Range")
            ? { Range: request.headers.get("Range") }
            : {}),
        },
      });

      if (!upstream.ok || !upstream.body) {
        return new Response("Upstream unavailable", {
          status: 502,
          headers: corsHeaders(),
        });
      }

      const headers = new Headers(corsHeaders());
      headers.set(
        "Content-Type",
        upstream.headers.get("Content-Type") || "audio/mpeg",
      );
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      const icy = [
        "icy-br",
        "icy-name",
        "icy-genre",
        "icy-url",
        "icy-description",
        "icy-pub",
      ];
      for (const key of icy) {
        const v = upstream.headers.get(key);
        if (v) headers.set(key, v);
      }

      return new Response(upstream.body, {
        status: upstream.status,
        headers,
      });
    } catch {
      return new Response("Proxy error", {
        status: 502,
        headers: corsHeaders(),
      });
    }
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range, Origin, Accept",
    "Access-Control-Expose-Headers":
      "Content-Type, Content-Length, Accept-Ranges, icy-br, icy-name",
  };
}
