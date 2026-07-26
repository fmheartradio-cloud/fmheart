"use client";

import { type FormEvent, useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { SITE } from "@/lib/site";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "");
    const email = String(fd.get("email") || "");
    const message = String(fd.get("message") || "");
    const subject = encodeURIComponent(`FM Heart Contact — ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`,
    );
    window.location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <TopBar />
      <Header />
      <main className="mx-auto max-w-3xl px-3 py-10 md:px-4">
        <p className="font-heading text-xs tracking-[0.2em] text-fh-red uppercase">
          Contact
        </p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold md:text-4xl">
          අපව අමතන්න
        </h1>
        <p className="mt-2 text-fh-muted">
          Advertising, song requests, partnerships — message එකක් යවන්න.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-semibold">Email:</span>{" "}
              <a href={`mailto:${SITE.email}`} className="text-fh-red hover:underline">
                {SITE.email}
              </a>
            </p>
            {SITE.phones.map((p) => (
              <p key={p}>
                <span className="font-semibold">Phone:</span> {p}
              </p>
            ))}
            <p>
              <span className="font-semibold">WhatsApp:</span>{" "}
              <a
                href={`https://wa.me/${SITE.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fh-red hover:underline"
              >
                +94 77 21 75 779
              </a>
            </p>
            <p className="text-fh-muted">{SITE.address}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <input
              name="name"
              required
              placeholder="නම"
              className="w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-fh-red"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="Email"
              className="w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-fh-red"
            />
            <textarea
              name="message"
              required
              rows={5}
              placeholder="Message"
              className="w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-fh-red"
            />
            <button
              type="submit"
              className="w-full bg-fh-red py-2.5 font-heading text-sm font-bold text-white hover:bg-fh-red-dark"
            >
              SEND MESSAGE
            </button>
            {sent && (
              <p className="text-xs text-fh-muted">
                Email app එක open විය යුතුයි. නැත්නම් {SITE.email} ට ලියන්න.
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
