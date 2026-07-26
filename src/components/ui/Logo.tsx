import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  variant?: "full" | "icon" | "compact" | "badge";
  className?: string;
};

export function Logo({ variant = "full", className = "" }: LogoProps) {
  if (variant === "icon") {
    return (
      <Link href="/" className={`inline-flex shrink-0 ${className}`} aria-label="FM Heart">
        <Image
          src="/logo/fmheart-icon-official.png"
          alt="FM Heart"
          width={44}
          height={44}
          priority
          className="object-contain"
        />
      </Link>
    );
  }

  if (variant === "badge") {
    return (
      <Link href="/" className={`inline-flex shrink-0 ${className}`} aria-label="FM Heart">
        <Image
          src="/logo/fmheart-badge.png"
          alt="FM Heart"
          width={120}
          height={140}
          priority
          className="h-auto w-[72px] object-contain md:w-[88px]"
        />
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link href="/" className={`inline-flex items-center gap-2 ${className}`} aria-label="FM Heart">
        <Image
          src="/logo/fmheart-icon-official.png"
          alt=""
          width={36}
          height={36}
          className="object-contain"
        />
        <span className="font-heading text-lg font-extrabold tracking-wide">
          <span className="text-white">FM</span>{" "}
          <span className="text-fh-red">HEART</span>
        </span>
      </Link>
    );
  }

  return (
    <Link href="/" className={`inline-flex items-center gap-3 ${className}`} aria-label="FM Heart">
      <Image
        src="/logo/fmheart-badge.png"
        alt=""
        width={64}
        height={74}
        priority
        className="h-14 w-auto object-contain md:h-16"
      />
      <span className="flex flex-col leading-none">
        <span className="font-heading text-2xl font-extrabold tracking-wide md:text-[1.75rem]">
          <span className="text-fh-ink">FM</span>{" "}
          <span className="text-fh-red">HEART</span>
        </span>
        <span className="mt-1 font-feature text-[10px] font-medium tracking-wider text-fh-muted md:text-[11px]">
          යෞවනයේ හද ගැහෙන රිද්මය
        </span>
      </span>
    </Link>
  );
}
