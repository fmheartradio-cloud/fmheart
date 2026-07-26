import Script from "next/script";

const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

/** Loads Google AdSense script when NEXT_PUBLIC_ADSENSE_CLIENT is set */
export function AdSenseScript() {
  if (!client || client.includes("YOUR_")) return null;
  return (
    <Script
      id="adsense"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
    />
  );
}
