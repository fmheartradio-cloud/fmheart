const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

/** AdSense script in <head> so Google can verify site ownership from HTML. */
export function AdSenseScript() {
  if (!client || client.includes("YOUR_")) return null;
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
    />
  );
}
