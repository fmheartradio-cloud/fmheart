/**
 * Serve ads.txt on fmheart.lk (apex) with HTTP 200.
 * Vercel redirects apex → www; Google AdSense checks fmheart.lk/ads.txt
 * and marks "Not found" when it only gets a 308. Keep in sync with public/ads.txt.
 */
const ADS_TXT =
  "google.com, pub-8733607596459970, DIRECT, f08c47fec0942fa0\n";

export default {
  async fetch() {
    return new Response(ADS_TXT, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};
