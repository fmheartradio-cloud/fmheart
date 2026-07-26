import Link from "next/link";
import { SITE } from "@/lib/site";

/** Fills the homepage banner slot when AdSense is not configured */
export function HeaderPromo() {
  return (
    <section className="overflow-hidden border border-neutral-200 bg-gradient-to-r from-fh-ink via-[#1a1a1a] to-fh-red-dark text-white">
      <div className="flex flex-col items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:py-5">
        <div className="min-w-0">
          <p className="font-heading text-[11px] tracking-[0.2em] text-fh-red uppercase">
            FM Heart Live
          </p>
          <p className="mt-1 font-heading text-xl font-extrabold md:text-2xl lg:text-3xl">
            {SITE.taglineSi}
          </p>
          <p className="mt-0.5 text-sm text-white/70">
            Live Radio · News · Gossip — එකම තැනක
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/live"
            className="inline-flex items-center justify-center bg-fh-red px-4 py-2.5 font-heading text-sm font-bold tracking-wide text-white transition hover:bg-fh-red-dark"
          >
            LIVE අහන්න
          </Link>
          <a
            href={`https://wa.me/${SITE.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-fh-whatsapp px-4 py-2.5 font-heading text-sm font-bold text-fh-black transition hover:brightness-110"
          >
            WhatsApp
          </a>
          <Link
            href="/advertise"
            className="inline-flex items-center justify-center border border-white/25 px-4 py-2.5 font-heading text-sm font-bold tracking-wide text-white transition hover:bg-white/10"
          >
            ADVERTISE
          </Link>
        </div>
      </div>
    </section>
  );
}
