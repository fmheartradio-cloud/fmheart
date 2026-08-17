import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `About | ${SITE.name}`,
  description:
    "FM Heart radio station and digital news platform — live streaming, Sinhala news, gossip, and youth entertainment from Sri Lanka.",
  alternates: { canonical: `${SITE.url}/about` },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <TopBar />
      <Header />
      <main className="mx-auto max-w-3xl px-3 py-10 md:px-4">
        <p className="font-heading text-xs tracking-[0.2em] text-fh-red uppercase">
          About
        </p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold md:text-4xl">
          FM Heart ගැන
        </h1>
        <p className="mt-2 text-sm text-fh-muted">
          {SITE.brandTitle} — {SITE.taglineSi}
        </p>

        <div className="prose-article mt-8 space-y-6 text-sm leading-relaxed text-neutral-800 md:text-base md:leading-8">
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-fh-ink">
              අපි කවුද?
            </h2>
            <p>
              <strong>{SITE.name}</strong> ({SITE.url}) ශ්‍රී ලංකාවේ තරුණ
              ප්‍රේක්ෂකයින් වෙත 24×7 live radio, සිංහල ප්‍රවෘත්ති, gossip,
              videos සහ entertainment content එක platform එකකින් ලබා දෙන
              digital media brand එකකි. Studio පිහිටීම: {SITE.address}.
            </p>
            <p>
              FM Heart Morning Show, Pulse Studio behind-the-scenes, Heart
              Academy student showcases වැනි original programming මගින්
              audience එකට radio experience එකට අමතරව website එකේ news,
              live player සහ social channels හරහා daily updates ලබා දෙනවා.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-fh-ink">
              ප්‍රවෘත්ති සහ අන්තර්ගතය
            </h2>
            <p>
              fmheart.lk හි ප්‍රවෘත්ති අංශය ශ්‍රී ලංකා සහ විදේශ පුවත්, ව්‍යාපාර,
              ක්‍රීඩා, gossip සහ entertainment categories වලට organize කර
              ඇත. Trusted wire sources (Ada Derana, News First, BBC Sinhala
              වැනි) සහ FM Heart editorial team එකේ curators ප්‍රකාශනය කරන
              content combine වෙනවා.
            </p>
            <p>
              අපි headlines copy-paste විතරක් නොව, reader එකට context, live
              radio tie-ins, සහ FM Heart community updates සහිත articles publish
              කරනවා. Source links article pages වල transparent ලෙස display
              වෙනවා; readers original reporting verify කරගන්න පුළුවන්.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-fh-ink">
              Editorial standards
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Sinhala headlines සහ body text Unicode UTF-8 — broken
                characters publish නොකරනවා
              </li>
              <li>
                Cover images watermark-heavy agency stills skip කර unique
                photos prioritize කරනවා
              </li>
              <li>
                Privacy Policy, Contact, සහ මෙම About page reader trust සහ
                publisher transparency සඳහා maintain කරනවා
              </li>
              <li>
                Live stream metadata (now playing) Icecast හරහා real-time update
                — static placeholder content නොවේ
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-fh-ink">
              Brands & partners
            </h2>
            <p>
              FM Heart ecosystem එකේ{" "}
              <a
                href="https://tha.lk"
                className="text-fh-red hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                The Heart Academy
              </a>
              , Pulse Studio, සහ fmheart.lk main platform එක එකට linked. Radio
              advertising සහ sponsored content:{" "}
              <Link href="/advertise" className="text-fh-red hover:underline">
                Advertise page
              </Link>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-fh-ink">
              අපව අමතන්න
            </h2>
            <p>
              Song requests, partnerships, advertising:{" "}
              <Link href="/contact" className="text-fh-red hover:underline">
                Contact
              </Link>{" "}
              · Email{" "}
              <a
                href={`mailto:${SITE.email}`}
                className="text-fh-red hover:underline"
              >
                {SITE.email}
              </a>{" "}
              · WhatsApp{" "}
              <a
                href={`https://wa.me/${SITE.whatsapp}`}
                className="text-fh-red hover:underline"
              >
                +94 77 217 5779
              </a>
            </p>
          </section>
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "AboutPage",
              name: `About ${SITE.name}`,
              description: SITE.description,
              url: `${SITE.url}/about`,
              inLanguage: "si",
              isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
              publisher: {
                "@type": "Organization",
                name: SITE.name,
                url: SITE.url,
              },
            }),
          }}
        />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
