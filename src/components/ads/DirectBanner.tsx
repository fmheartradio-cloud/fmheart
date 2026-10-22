"use client";

import { useState } from "react";

type DirectBannerProps = {
  imageUrl: string;
  href?: string;
  alt?: string;
  width?: number;
  height?: number;
  /** Fill the parent width while keeping width/height ratio. */
  fill?: boolean;
  className?: string;
  objectFit?: "cover" | "contain";
};

export function DirectBanner({
  imageUrl,
  href,
  alt = "Advertisement",
  width,
  height,
  fill = false,
  className = "",
  objectFit = "contain",
}: DirectBannerProps) {
  const [failed, setFailed] = useState(false);
  const ratio = width && height ? `${width} / ${height}` : undefined;
  const boxStyle = ratio
    ? {
        aspectRatio: ratio,
        width: "100%" as const,
        maxWidth: fill ? "100%" : width,
        height: "auto" as const,
        minHeight: height,
      }
    : { width: "100%" as const };

  const img = failed ? (
    <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-900 px-3 text-center">
      <p className="text-[10px] tracking-[0.2em] text-neutral-500 uppercase">
        Advertisement
      </p>
      <p className="mt-1 font-heading text-sm font-bold text-white/80">{alt}</p>
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      loading="eager"
      decoding="async"
      className={`h-full w-full ${
        objectFit === "cover" ? "object-cover" : "object-contain"
      }`}
      onError={() => setFailed(true)}
    />
  );

  const box = (
    <div
      className={`mx-auto overflow-hidden bg-neutral-100 ${className}`}
      style={boxStyle}
    >
      {img}
    </div>
  );

  if (!href) return box;

  return (
    <a
      href={href}
      target={href.startsWith("/") ? undefined : "_blank"}
      rel={href.startsWith("/") ? undefined : "noopener noreferrer sponsored"}
      className="block w-full max-w-full"
      aria-label={alt}
    >
      {box}
    </a>
  );
}
