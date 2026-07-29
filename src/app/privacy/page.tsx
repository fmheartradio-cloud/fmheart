import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Privacy Policy | ${SITE.name}`,
  description: `Privacy Policy for ${SITE.name} website and related services.`,
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <TopBar />
      <Header />
      <main className="mx-auto max-w-3xl px-3 py-10 md:px-4">
        <p className="font-heading text-xs tracking-[0.2em] text-fh-red uppercase">
          Legal
        </p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-fh-muted">
          Last updated: 29 July 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-neutral-800">
          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold">1. Who we are</h2>
            <p>
              {SITE.name} ({SITE.url}) operates a Sri Lankan radio and news
              website, including live streaming, news articles, and related
              content. Contact:{" "}
              <a
                href={`mailto:${SITE.email}`}
                className="text-fh-red hover:underline"
              >
                {SITE.email}
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold">
              2. Information we collect
            </h2>
            <p>We may collect:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Technical data such as browser type, device, and approximate
                location when you visit the site
              </li>
              <li>
                Contact details you send us (name, email, message) via forms or
                email
              </li>
              <li>
                Admin account data for staff who manage content on this website
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold">
              3. How we use information
            </h2>
            <p>We use information to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Operate and improve the website and live radio experience</li>
              <li>Publish news and respond to contact messages</li>
              <li>
                Share selected published news headlines to our official Facebook
                Page via Meta&apos;s APIs
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold">
              4. Facebook / Meta integration
            </h2>
            <p>
              When a news article is published on this website, we may
              automatically create a post on our own Facebook Page using the
              Meta Graph API. This uses a Page access token controlled by{" "}
              {SITE.name}. We do not request or store personal Facebook data
              from page visitors for this feature.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold">5. Cookies</h2>
            <p>
              The site may use essential cookies or similar technologies needed
              for basic operation, analytics, or hosting. You can control
              cookies through your browser settings.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold">6. Sharing</h2>
            <p>
              We do not sell personal information. We may use trusted service
              providers (hosting, analytics, Firebase, Meta) to run the site.
              Those providers process data only as needed to provide their
              services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold">7. Contact</h2>
            <p>
              Privacy questions:{" "}
              <a
                href={`mailto:${SITE.email}`}
                className="text-fh-red hover:underline"
              >
                {SITE.email}
              </a>
              <br />
              Address: {SITE.address}
            </p>
          </section>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
