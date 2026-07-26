import type { Metadata, Viewport } from "next";
import {
  Abhaya_Libre,
  Gemunu_Libre,
  Noto_Sans_Sinhala,
  Yaldevi,
} from "next/font/google";
import { AdSenseScript } from "@/components/seo/AdSenseScript";
import { OrganizationJsonLd } from "@/components/seo/JsonLd";
import { Providers } from "@/components/Providers";
import { SITE } from "@/lib/site";
import "./globals.css";

const notoSansSinhala = Noto_Sans_Sinhala({
  variable: "--font-ui",
  subsets: ["sinhala", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const gemunuLibre = Gemunu_Libre({
  variable: "--font-heading",
  subsets: ["sinhala", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const abhayaLibre = Abhaya_Libre({
  variable: "--font-article",
  subsets: ["sinhala", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const yaldevi = Yaldevi({
  variable: "--font-feature",
  subsets: ["sinhala", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ශ්‍රී ලංකාවේ තරුණ හදවතේ Digital Media Platform`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "FM Heart",
    "fmheart.lk",
    "Sinhala news",
    "Sri Lanka radio",
    "gossip",
    "live radio",
    "සිංහල පුවත්",
  ],
  authors: [{ name: "FM Heart" }],
  creator: "FM Heart",
  publisher: "FM Heart",
  alternates: {
    canonical: SITE.url,
    types: {
      "application/rss+xml": `${SITE.url}/rss.xml`,
    },
  },
  openGraph: {
    type: "website",
    locale: "si_LK",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — Digital Media Platform`,
    description: SITE.description,
    images: [
      {
        url: "/logo/fmheart-cover.png",
        width: 1200,
        height: 1200,
        alt: "FM Heart",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.taglineEn,
    images: ["/logo/fmheart-cover.png"],
  },
  icons: {
    icon: [{ url: "/logo/fmheart-icon-official.png", type: "image/png" }],
    apple: "/logo/fmheart-badge.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export const viewport: Viewport = {
  themeColor: "#D50000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="si"
      className={`${notoSansSinhala.variable} ${gemunuLibre.variable} ${abhayaLibre.variable} ${yaldevi.variable} h-full`}
    >
      <body className="min-h-full bg-white font-sans text-fh-ink antialiased">
        <OrganizationJsonLd />
        <AdSenseScript />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
