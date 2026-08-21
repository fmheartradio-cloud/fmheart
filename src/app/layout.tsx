import type { Metadata, Viewport } from "next";
import {
  Abhaya_Libre,
  Gemunu_Libre,
  Noto_Sans_Sinhala,
  Poppins,
  Yaldevi,
} from "next/font/google";
import { AdSenseScript } from "@/components/seo/AdSenseScript";
import { GoogleAnalytics } from "@/components/seo/GoogleAnalytics";
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

/** Latin/English in mixed Sinhala headlines (Isi fonts lack a clean Latin face). */
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.brandTitle,
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
    title: SITE.brandTitle,
    description: SITE.description,
    images: [
      {
        url: "/logo/website-Feature.png",
        width: 516,
        height: 276,
        alt: "FM Heart",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.brandTitle,
    description: SITE.description,
    images: ["/logo/website-Feature.png"],
  },
  icons: {
    icon: [{ url: "/logo/fm-icon.png", type: "image/png" }],
    shortcut: "/logo/fm-icon.png",
    apple: "/logo/fm-icon.png",
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
      className={`${notoSansSinhala.variable} ${gemunuLibre.variable} ${abhayaLibre.variable} ${yaldevi.variable} ${poppins.variable} h-full`}
    >
      <head>
        <AdSenseScript />
      </head>
      <body className="min-h-full bg-white font-sans text-fh-ink antialiased">
        <OrganizationJsonLd />
        <GoogleAnalytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
