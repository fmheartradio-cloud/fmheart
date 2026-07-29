"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const FALLBACK_COVER = "/logo/fmheart-cover.png";

type CoverImageProps = {
  src: string;
  alt?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  unoptimized?: boolean;
  sizes?: string;
  className?: string;
  /** Extra classes for the watermark wrapper. */
  watermarkClassName?: string;
  /** Hide watermark (placeholder covers / tiny thumbs). */
  showWatermark?: boolean;
};

/**
 * News cover image with automatic FM Heart watermark overlay.
 * Display-only — does not rewrite the stored cover URL.
 */
export function CoverImage({
  src,
  alt = "",
  fill = false,
  width,
  height,
  priority = false,
  unoptimized = true,
  sizes,
  className = "object-cover",
  watermarkClassName = "",
  showWatermark = true,
}: CoverImageProps) {
  const safeSrc =
    src?.trim() && !/^data:$/i.test(src.trim())
      ? src.trim()
      : FALLBACK_COVER;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [safeSrc]);

  const resolvedSrc = failed ? FALLBACK_COVER : safeSrc;
  const isPlaceholder = resolvedSrc.includes("fmheart-cover.png");
  const watermark = showWatermark && !isPlaceholder;

  const onError = () => {
    if (!failed && resolvedSrc !== FALLBACK_COVER) setFailed(true);
  };

  return (
    <>
      {fill ? (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          priority={priority}
          unoptimized={unoptimized}
          sizes={sizes}
          className={className}
          onError={onError}
        />
      ) : (
        <Image
          src={resolvedSrc}
          alt={alt}
          width={width ?? 800}
          height={height ?? 450}
          priority={priority}
          unoptimized={unoptimized}
          sizes={sizes}
          className={className}
          onError={onError}
        />
      )}
      {watermark ? (
        <div
          className={`pointer-events-none absolute top-1.5 left-1.5 z-[1] w-[18%] max-w-[85px] sm:top-2 sm:left-2 sm:w-[16%] sm:max-w-[100px] md:w-[14%] md:max-w-[115px] ${watermarkClassName}`}
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/24-water-mark.png"
            alt=""
            width={3834}
            height={1309}
            className="block h-auto w-full object-contain opacity-95"
            draggable={false}
          />
        </div>
      ) : null}
    </>
  );
}
