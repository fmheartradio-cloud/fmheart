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
  { href: "/advertise", label: "Advertise With Us" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="bg-fh-black text-neutral-300">
      <div className="border-b border-white/10 bg-fh-black">
        <div className="relative mx-auto flex max-w-5xl justify-center px-3 py-2 md:px-4 md:py-3">
          <Image
            src="/logo/footer-image.png"
            alt="FM Heart brands — The Heart Academy, Pulse Studio, and partners"
            width={1200}
            height={160}
            className="h-12 w-auto max-w-full object-contain sm:h-14 md:h-16"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 960px"
            priority={false}
          />
          {/* Clickable zones for key brands in the strip */}
          <div className="absolute inset-0 mx-auto grid max-w-5xl grid-cols-6">
            <a
              href="https://tha.lk"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              aria-label="The Heart Academy"
            />
            <Link href="/" className="block" aria-label="FM Heart" />
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
      </div>

      <div className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 md:grid-cols-[1.2fr_1fr_1fr] md:py-8">
          <div>
            <Logo variant="compact" />
            <p className="mt-4 max-w-sm font-feature text-sm leading-relaxed text-neutral-400">
              ශ්‍රී ලංකාවේ තරුණ හදවතේ Digital Media Platform — Live Radio,
              News, Gossip සහ Entertainment එකම තැනක.
            </p>
            <form
              className="mt-5 flex max-w-md gap-2"
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

          <div>
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

          <div>
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
            <div className="mt-5 space-y-1 text-sm text-neutral-400">
              {SITE.phones.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <p>
                <a href={`https://wa.me/${SITE.whatsapp}`} className="hover:text-white">
                  WhatsApp +94 77 21 75 779
                </a>
              </p>
              <p>{SITE.email}</p>
              <p>{SITE.address}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 text-xs text-neutral-500 md:flex-row">
        <p>© {new Date().getFullYear()} FM Heart. All rights reserved.</p>
        <div className="flex gap-4">
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
