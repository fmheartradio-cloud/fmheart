import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Terms of Use | ${SITE.name}`,
  description: `Terms of use for ${SITE.url} — content, live stream, and user responsibilities.`,
  alternates: { canonical: `${SITE.url}/terms` },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <TopBar />
      <Header />
      <main className="mx-auto max-w-3xl px-3 py-10 md:px-4">
        <p className="font-heading text-xs tracking-[0.2em] text-fh-red uppercase">
          Legal
        </p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold md:text-4xl">
          Terms of Use
        </h1>
        <p className="mt-2 text-sm text-fh-muted">Last updated: 17 August 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-neutral-800">
          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold">1. Service</h2>
            <p>
              {SITE.name} provides free access to live radio streams, news,
              videos, and related pages at {SITE.url}. We may update, pause, or
              discontinue features without prior notice for maintenance or
              legal reasons.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold">2. Content</h2>
            <p>
              News and media on this site may include third-party sources.
              Headlines, images, and summaries remain the property of their
              respective owners where applicable. FM Heart branding, layout,
              original shows, and curated presentation are © {SITE.name}.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold">3. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Scrape or overload our servers, APIs, or live stream</li>
              <li>Republish full articles without permission or attribution</li>
              <li>Use the site for unlawful, harassing, or misleading purposes</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold">4. Disclaimer</h2>
            <p>
              Content is provided &quot;as is&quot; for general information and
              entertainment. We do not guarantee uninterrupted live streaming or
              complete accuracy of every third-party news item.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold">5. Contact</h2>
            <p>
              Questions:{" "}
              <Link href="/contact" className="text-fh-red hover:underline">
                Contact
              </Link>{" "}
              ·{" "}
              <Link href="/privacy" className="text-fh-red hover:underline">
                Privacy Policy
              </Link>{" "}
              ·{" "}
              <Link href="/about" className="text-fh-red hover:underline">
                About
              </Link>
            </p>
          </section>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
