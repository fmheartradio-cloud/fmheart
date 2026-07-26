import Image from "next/image";
import Link from "next/link";

export function BrandPromo() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <Link
        href="/academy"
        className="group relative overflow-hidden bg-fh-black px-6 py-8 text-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(213,0,0,0.35),transparent_55%)]" />
        <div className="relative flex items-start gap-4">
          <Image
            src="/logo/heart-academy.png"
            alt="The Heart Academy"
            width={160}
            height={64}
            className="h-14 w-auto object-contain"
          />
          <div>
            <p className="font-heading text-xs tracking-[0.2em] text-fh-red uppercase">
              Institute of Media
            </p>
            <h3 className="mt-2 font-heading text-2xl font-extrabold">
              The Heart Academy
            </h3>
            <p className="mt-2 max-w-sm text-sm text-neutral-400">
              Media, radio & content courses — තරුණයන්ට professional path එකක්.
            </p>
            <span className="mt-4 inline-block font-heading text-sm font-bold text-fh-red group-hover:underline">
              Courses බලන්න →
            </span>
          </div>
        </div>
      </Link>

      <Link
        href="/pulse-studio"
        className="group relative overflow-hidden bg-neutral-900 px-6 py-8 text-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,23,68,0.25),transparent_50%)]" />
        <div className="relative flex items-start gap-4">
          <Image
            src="/logo/fmheart-pulse-icon.png"
            alt="Pulse Studio"
            width={64}
            height={64}
            className="h-14 w-14 object-contain"
          />
          <div>
            <div className="mb-2 h-1 w-16 bg-fh-red" aria-hidden />
            <h3 className="font-heading text-2xl font-extrabold tracking-wide">
              PULSE <span className="text-fh-red">STUDIO</span>
            </h3>
            <p className="mt-2 max-w-sm text-sm text-neutral-400">
              Recording, podcast & production bookings — your sound, our studio.
            </p>
            <span className="mt-4 inline-block font-heading text-sm font-bold text-fh-red group-hover:underline">
              Studio book කරන්න →
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}
