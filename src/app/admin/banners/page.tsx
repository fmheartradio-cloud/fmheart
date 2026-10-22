"use client";

import Link from "next/link";

export default function AdminBannersPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold md:text-3xl">
          Banners & Sliders
        </h1>
        <p className="mt-1 text-sm text-fh-muted">
          Homepage hero slides සහ ad slots දෙකම මෙතනින්.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/admin/ads"
          className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
        >
          <p className="font-heading text-lg font-extrabold">Ad banners</p>
          <p className="mt-1 text-sm text-fh-muted">
            Header 1280×160, in-feed 970×250, player/sidebar 300×250
          </p>
        </Link>
        <Link
          href="/admin/hero"
          className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
        >
          <p className="font-heading text-lg font-extrabold">Hero sliders</p>
          <p className="mt-1 text-sm text-fh-muted">
            Homepage slider CMS backup
          </p>
        </Link>
      </div>
    </div>
  );
}
