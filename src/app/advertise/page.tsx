"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { SITE } from "@/lib/site";

const packages = [
  {
    title: "Website Banner",
    detail: "Homepage / article header & sidebar placements",
  },
  {
    title: "Sponsored Article",
    detail: "Branded news or gossip story with CMS publish",
  },
  {
    title: "Radio Spot",
    detail: "Live radio commercial / RJ mention packages",
  },
  {
    title: "Social Boost",
    detail: "Facebook / Instagram / TikTok shoutouts",
  },
];

export default function AdvertisePage() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "");
    const brand = String(fd.get("brand") || "");
    const email = String(fd.get("email") || "");
    const packageName = String(fd.get("package") || "");
    const message = String(fd.get("message") || "");
    const subject = encodeURIComponent(`Advertise with FM Heart — ${brand || name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nBrand: ${brand}\nEmail: ${email}\nPackage: ${packageName}\n\n${message}`,
    );
    window.location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <TopBar />
      <Header />
      <main>
        <section className="bg-fh-black px-3 py-12 text-white md:px-4 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-heading text-xs tracking-[0.25em] text-fh-red uppercase">
              Advertise
            </p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold md:text-5xl">
              Grow With FM Heart
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-neutral-300">
              Young Sinhala audience · Live radio + digital news · Banner,
              sponsored & radio packages.
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-5xl gap-10 px-3 py-10 md:grid-cols-2 md:px-4">
          <div>
            <h2 className="font-heading text-xl font-extrabold">Packages</h2>
            <ul className="mt-4 space-y-3">
              {packages.map((p) => (
                <li key={p.title} className="border border-neutral-200 p-4">
                  <p className="font-heading font-bold">{p.title}</p>
                  <p className="mt-1 text-sm text-fh-muted">{p.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-fh-muted">
              Or message on{" "}
              <a
                href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent("Hi FM Heart — I want to advertise")}`}
                className="font-semibold text-fh-red hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
              .{" "}
              <Link href="/contact" className="hover:underline">
                Contact page →
              </Link>
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <h2 className="font-heading text-xl font-extrabold">Request a quote</h2>
            <input
              name="name"
              required
              placeholder="Your name"
              className="w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-fh-red"
            />
            <input
              name="brand"
              required
              placeholder="Brand / Company"
              className="w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-fh-red"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="Email"
              className="w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-fh-red"
            />
            <select
              name="package"
              className="w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-fh-red"
              defaultValue="Website Banner"
            >
              {packages.map((p) => (
                <option key={p.title} value={p.title}>
                  {p.title}
                </option>
              ))}
            </select>
            <textarea
              name="message"
              rows={4}
              placeholder="Budget, dates, goals..."
              className="w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-fh-red"
            />
            <button
              type="submit"
              className="w-full bg-fh-red py-2.5 font-heading text-sm font-bold text-white hover:bg-fh-red-dark"
            >
              SEND REQUEST
            </button>
            {sent && (
              <p className="text-xs text-fh-muted">
                Email app එක open විය යුතුයි — {SITE.email}
              </p>
            )}
          </form>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
