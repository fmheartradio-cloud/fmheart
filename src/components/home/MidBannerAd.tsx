import Link from "next/link";

export function MidBannerAd() {
  return (
    <section className="bg-fh-black px-4 py-8 text-center text-white md:py-10">
      <p className="font-heading text-xs tracking-[0.25em] text-fh-red uppercase">
        Partner With FM Heart
      </p>
      <h2 className="mt-2 font-heading text-2xl font-extrabold md:text-3xl">
        YOUR BRAND HERE — Promote With FM Heart
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-400">
        Homepage banners · Sponsored articles · Radio commercials · Social boost
      </p>
      <Link
        href="/promotion"
        className="mt-5 inline-flex bg-fh-red px-6 py-2.5 font-heading text-sm font-bold tracking-wide text-white transition hover:bg-fh-red-dark"
      >
        PROMOTE WITH US
      </Link>
    </section>
  );
}
