const SIGNATURE = "tiktokO67ak15INTaBNgJyElUviESKPIssH2Fv";

/** TikTok URL-prefix verification (path without .txt extension). */
export function GET() {
  return new Response(SIGNATURE, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
