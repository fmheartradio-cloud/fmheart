import Link from "next/link";

export function AdvertiseWidget() {
  return (
    <aside className="relative overflow-hidden bg-gradient-to-br from-fh-red to-fh-red-dark p-5 text-white">
      <div
        className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/10"
        aria-hidden
      />
      <p className="font-heading text-xs font-bold tracking-[0.2em] uppercase opacity-90">
        Grow Your Brand
      </p>
      <h2 className="mt-2 font-heading text-2xl font-extrabold leading-tight">
        ADVERTISE WITH US
      </h2>
      <p className="mt-2 max-w-[220px] text-sm text-white/85">
        FM Heart audience එකට reach වෙන්න — banner, sponsored & radio spots.
      </p>
      <Link
        href="/advertise"
        className="mt-4 inline-flex bg-white px-4 py-2 font-heading text-sm font-bold text-fh-red transition hover:bg-neutral-100"
      >
        CONTACT US
      </Link>
    </aside>
  );
}
