import Image from "next/image";

const HEART_ACADEMY_URL = "https://tha.lk";
const PULSE_STUDIO_WHATSAPP = "https://wa.me/94771664184";

export function BrandPromo() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <a
        href={HEART_ACADEMY_URL}
        target="_blank"
        rel="noopener noreferrer"
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
      </a>

      <a
        href={PULSE_STUDIO_WHATSAPP}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative overflow-hidden bg-fh-black px-6 py-8 text-white"
      >
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Image
            src="/logo/pulse-studio.png"
            alt="Pulse Studio"
            width={420}
            height={160}
            className="h-16 w-auto max-w-full object-contain sm:h-20"
            priority={false}
          />
          <div className="min-w-0">
            <p className="max-w-sm text-sm text-neutral-400">
              Recording, podcast & production bookings — your sound, our studio.
            </p>
            <span className="mt-4 inline-block font-heading text-sm font-bold text-fh-red group-hover:underline">
              Studio book කරන්න →
            </span>
          </div>
        </div>
      </a>
    </section>
  );
}
