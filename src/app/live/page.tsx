import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { LiveHeroControls } from "@/components/home/LiveHeroControls";
import { LiveRadioPlayer } from "@/components/home/LiveRadioPlayer";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { adSlot } from "@/lib/ads";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Live Radio",
  description: `FM Heart Live Stream — ${SITE.taglineEn}. Listen now at fmheart.lk`,
  openGraph: {
    title: "FM Heart Live Radio",
    description: SITE.taglineEn,
  },
};

export default function LivePage() {
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <TopBar />
      <Header />
      <main>
        <section className="relative overflow-hidden bg-fh-black text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(213,0,0,0.35),transparent_55%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.1fr_0.9fr] md:py-14">
            <div>
              <p className="font-heading text-xs tracking-[0.25em] text-fh-red uppercase">
                24/7 HD Stream
              </p>
              <h1 className="mt-3 font-heading text-4xl font-extrabold md:text-5xl">
                FM Heart Live Radio
              </h1>
              <p className="mt-3 max-w-xl font-feature text-lg text-neutral-300">
                {SITE.taglineSi}
              </p>
              <LiveHeroControls />
              <p className="mt-6 text-xs text-neutral-500">
                Stream powered by FM Heart · Song requests via WhatsApp
              </p>
            </div>
            <div className="min-h-[420px] overflow-hidden rounded-lg border border-white/10">
              <LiveRadioPlayer />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
          <AdSenseUnit
            slot={adSlot("header")}
            label="Live Page Banner"
            className="min-h-[90px]"
          />
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Music Requests",
                body: "WhatsApp එකෙන් ඔබේ ගීතය request කරන්න.",
                href: `https://wa.me/${SITE.whatsapp}`,
              },
              {
                title: "Advertise On Air",
                body: "Radio commercials සහ sponsorship packages.",
                href: "/advertise",
              },
              {
                title: "Pulse Studio",
                body: "Recording & podcast bookings.",
                href: "/pulse-studio",
                logo: "/logo/pulse-studio.png",
              },
            ].map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="border border-neutral-200 p-5 transition hover:border-fh-red"
              >
                {"logo" in card && card.logo ? (
                  <div className="mb-3 flex h-14 items-center justify-center bg-fh-black px-3">
                    <Image
                      src={card.logo}
                      alt={card.title}
                      width={280}
                      height={80}
                      className="h-12 w-auto max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <h2 className="font-heading text-lg font-bold">{card.title}</h2>
                )}
                <p className="mt-2 text-sm text-fh-muted">{card.body}</p>
              </Link>
            ))}
          </div>
          <div className="flex justify-center bg-fh-black p-6">
            <Image
              src="/logo/fmheart-tagline.png"
              alt="යෞවනයේ හද ගැහෙන රිද්මය"
              width={640}
              height={180}
              className="h-auto w-full max-w-xl object-contain"
            />
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
