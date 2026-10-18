import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { HOME_AD_SLOTS, PROMOTION_PACKAGES } from "@/lib/ad-placements";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Promotion Plan",
  description:
    "FM Heart promotion plan — homepage ad sizes, radio spots, sponsored stories, and social packages.",
  alternates: { canonical: `${SITE.url}/promotion` },
};

const whatsappHref = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
  "Hi FM Heart — I want a promotion package",
)}`;

export default function PromotionPage() {
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <TopBar />
      <Header />
      <main>
        <section className="bg-fh-black px-3 py-12 text-white md:px-4 md:py-16">
          <div className="mx-auto max-w-4xl text-center">
            <p className="font-heading text-xs tracking-[0.25em] text-fh-red uppercase">
              Promotion Plan
            </p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold md:text-5xl">
              Promote With FM Heart
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-neutral-300">
              fmheart.lk homepage, live radio, සහ social channels එකට brand එක
              ගේන්න. පහත sizes සහ packages අපේ live site එකේ තියෙන slots වලට
              හරියටම ගැලපෙනවා.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex bg-fh-whatsapp px-5 py-2.5 font-heading text-sm font-bold text-fh-black transition hover:brightness-110"
              >
                WhatsApp කරන්න
              </a>
              <Link
                href="/advertise"
                className="inline-flex border border-white/25 px-5 py-2.5 font-heading text-sm font-bold text-white transition hover:bg-white/10"
              >
                Quote එකක් ඉල්ලන්න
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-3 py-10 md:px-4">
          <h2 className="font-heading text-xl font-extrabold md:text-2xl">
            Homepage ad slots
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-fh-muted">
            මේ sizes තමයි දැන් home page එකේ තියෙන්නේ. Creative files මේ
            dimensions වලට යවන්න.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {HOME_AD_SLOTS.map((slot) => (
              <article
                key={slot.id}
                className="border border-neutral-200 bg-white p-5"
              >
                <p className="font-heading text-xs tracking-[0.2em] text-fh-red uppercase">
                  {slot.iab}
                </p>
                <h3 className="mt-1 font-heading text-lg font-extrabold">
                  {slot.name}
                </h3>
                <p className="text-sm text-fh-muted">{slot.nameSi}</p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-3 border-b border-neutral-100 pb-2">
                    <dt className="text-fh-muted">Size</dt>
                    <dd className="text-right font-semibold text-fh-ink">
                      {slot.sizes.join(" · ")}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-neutral-100 pb-2">
                    <dt className="text-fh-muted">Min height</dt>
                    <dd className="font-semibold">{slot.minHeight}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-neutral-100 pb-2">
                    <dt className="text-fh-muted">Width</dt>
                    <dd className="text-right font-semibold">{slot.width}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-fh-muted">Type</dt>
                    <dd className="font-semibold">{slot.type}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm text-neutral-600">{slot.location}</p>
                <SlotPreview id={slot.id} />
              </article>
            ))}
          </div>
        </section>

        <section className="bg-fh-surface px-3 py-10 md:px-4">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-heading text-xl font-extrabold md:text-2xl">
              Packages
            </h2>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {PROMOTION_PACKAGES.map((pkg) => (
                <li key={pkg.title} className="border border-neutral-200 bg-white p-5">
                  <p className="font-heading text-lg font-bold">{pkg.title}</p>
                  <p className="mt-2 text-sm text-fh-muted">{pkg.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-fh-muted">
              Rates campaign, duration සහ slot එක අනුව. Media kit / quote:{" "}
              <a href={`mailto:${SITE.email}`} className="font-semibold text-fh-red hover:underline">
                {SITE.email}
              </a>
              {" · "}
              {SITE.phones[0]}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-3 py-12 text-center md:px-4">
          <h2 className="font-heading text-2xl font-extrabold">
            Brand එක FM Heart එක්ක promote කරන්න
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-fh-muted">
            Young Sinhala audience · live radio + digital news. Slot book කරගන්න
            WhatsApp හෝ quote form එක භාවිතා කරන්න.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex bg-fh-red px-6 py-2.5 font-heading text-sm font-bold text-white transition hover:bg-fh-red-dark"
            >
              PROMOTE WITH US
            </a>
            <Link
              href="/advertise"
              className="inline-flex border border-neutral-300 px-6 py-2.5 font-heading text-sm font-bold text-fh-ink transition hover:border-fh-red hover:text-fh-red"
            >
              Request a quote
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

function SlotPreview({ id }: { id: string }) {
  if (id === "player") {
    return (
      <div className="mt-4 flex justify-center bg-fh-ink p-4">
        <div className="flex h-[125px] w-[150px] items-center justify-center border border-dashed border-white/30 bg-white/5 text-center text-[10px] font-heading font-bold tracking-wide text-white/70">
          300 × 250
        </div>
      </div>
    );
  }

  if (id === "sidebar") {
    return (
      <div className="mt-4 flex justify-center bg-fh-surface p-4">
        <div className="flex h-[125px] w-[150px] items-center justify-center border border-dashed border-neutral-400 bg-white text-center text-[10px] font-heading font-bold tracking-wide text-neutral-500">
          300 × 250
        </div>
      </div>
    );
  }

  if (id === "inFeed") {
    return (
      <div className="mt-4 bg-fh-surface p-4">
        <div className="flex min-h-[80px] w-full items-center justify-center border border-dashed border-neutral-400 bg-white text-[10px] font-heading font-bold tracking-wide text-neutral-500">
          IN-FEED · 300 × 250 / fluid
        </div>
      </div>
    );
  }

  if (id === "partnerStrip") {
    return (
      <div className="mt-4 bg-fh-black px-3 py-6 text-center">
        <p className="font-heading text-[10px] tracking-[0.2em] text-fh-red uppercase">
          Full bleed
        </p>
        <p className="mt-1 font-heading text-xs font-bold text-white">
          Partner strip
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-fh-surface p-3">
      <div className="flex min-h-[48px] w-full items-center justify-center border border-dashed border-neutral-400 bg-white text-[10px] font-heading font-bold tracking-wide text-neutral-500">
        728 × 90 LEADERBOARD
      </div>
    </div>
  );
}
