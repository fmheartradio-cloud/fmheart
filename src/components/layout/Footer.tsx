"use client";

import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SITE } from "@/lib/site";

const quickLinks = [
  { href: "/live", label: "Live Radio" },
  { href: "/news", label: "ප්‍රවෘත්ති" },
  { href: "/gossip", label: "Gossip" },
  { href: "/videos", label: "Videos" },
  { href: "/podcast", label: "Podcast" },
  { href: "/events", label: "Events" },
];

const brandLinks = [
  { href: "https://tha.lk", label: "The Heart Academy", external: true },
  {
    href: "https://wa.me/94771664184",
    label: "Pulse Studio",
    external: true,
  },
  { href: "/about", label: "About" },
  { href: "/advertise", label: "Advertise With Us" },
  { href: "/contact", label: "Contact" },
];

function FooterBrandStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`relative mx-auto inline-flex w-full max-w-full ${className}`}>
      <Image
        src="/logo/footer-image.png"
        alt="FM Heart brands — The Heart Academy, Pulse Studio, and partners"
        width={2848}
        height={208}
        className="mx-auto h-5 w-auto max-w-[min(100%,280px)] object-contain object-center sm:h-6 sm:max-w-[340px] md:mx-0 md:h-7 md:max-w-[400px] md:object-right"
        sizes="(max-width: 640px) 280px, 400px"
        priority={false}
      />
      <div className="absolute inset-0 grid grid-cols-6">
        <a
          href="https://tha.lk"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          aria-label="The Heart Academy"
        />
        <Link href="/" className="block" aria-label="FM Heart 24x7" />
        <a
          href="https://wa.me/94771664184"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          aria-label="Pulse Studio WhatsApp booking"
        />
        <span className="block" aria-hidden />
        <span className="block" aria-hidden />
        <span className="block" aria-hidden />
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-fh-black text-neutral-300">
      <div className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-6 px-3 py-4 text-left sm:px-4 md:grid-cols-[1.2fr_1fr_1fr] md:gap-4 md:py-5">
          <div className="flex flex-col items-start">
            <Logo variant="compact" />
            <p className="mt-4 max-w-sm font-feature text-sm leading-relaxed text-neutral-400">
              තාරුණ්‍යය ම Update වෙන ලංකාවේ Platform එක!
              <br />
              Live Radio, News, Gossip සහ Entertainment එක ම තැනක.
            </p>
            <form
              className="mt-5 flex w-full max-w-md gap-2"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                required
                placeholder="ඔබේ email එක..."
                className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-fh-red placeholder:text-neutral-500 focus:ring-2"
              />
              <button
                type="submit"
                className="shrink-0 rounded-md bg-fh-red px-4 py-2.5 font-heading text-sm font-bold text-white"
              >
                SUBSCRIBE
              </button>
            </form>
          </div>

          <div className="flex flex-col items-start">
            <h3 className="font-heading text-base font-bold text-white">
              Quick Links
            </h3>
            <ul className="mt-3 space-y-2">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-start">
            <h3 className="font-heading text-base font-bold text-white">
              Brands & Business
            </h3>
            <ul className="mt-3 space-y-2">
              {brandLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    {...("external" in l && l.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="text-sm hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="mt-6 font-heading text-base font-bold text-white">
              Contact Info
            </h3>
            <div className="mt-3 space-y-1 text-left text-sm text-neutral-400">
              <p>{SITE.address}</p>
              {SITE.phones.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <p>
                <a
                  href={`https://wa.me/${SITE.whatsapp}`}
                  className="hover:text-white"
                >
                  WhatsApp +94 77 21 75 779
                </a>
              </p>
              <p>
                <a href={`mailto:${SITE.email}`} className="hover:text-white">
                  {SITE.email}
                </a>
              </p>
            </div>

            <div className="mt-4 hidden md:mt-auto md:flex md:justify-end md:pt-4 md:self-end">
              <FooterBrandStrip />
            </div>
          </div>
        </div>
        <div className="flex justify-center px-3 pb-4 md:hidden">
          <FooterBrandStrip />
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-start justify-center gap-3 px-4 py-3 text-left text-xs text-neutral-500 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} FM Heart. All rights reserved.</p>
        <div className="flex gap-4">
          <Link href="/about" className="hover:text-neutral-300">
            About
          </Link>
          <Link href="/privacy" className="hover:text-neutral-300">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-neutral-300">
            Terms
          </Link>
          <a href="#top" className="text-fh-red hover:underline">
            ↑ Back to Top
          </a>
        </div>
      </div>
    </footer>
  );
}
