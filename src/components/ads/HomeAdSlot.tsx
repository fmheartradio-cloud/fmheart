"use client";

import type { ReactNode } from "react";
import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { DirectBanner } from "@/components/ads/DirectBanner";
import { adSlot } from "@/lib/ads";
import { isLiveBanner, type DirectAdBanner } from "@/types/ads";

type HomeAdSlotProps = {
  banner?: DirectAdBanner | null;
  adsenseKind?: "header" | "sidebar" | "inArticle" | "player";
  label: string;
  className?: string;
  width?: number;
  height?: number;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  responsive?: boolean;
  fallback?: ReactNode;
  objectFit?: "cover" | "contain";
};

export function HomeAdSlot({
  banner,
  adsenseKind,
  label,
  className = "",
  width,
  height,
  format = "auto",
  responsive = true,
  fallback,
  objectFit = "cover",
}: HomeAdSlotProps) {
  if (isLiveBanner(banner)) {
    return (
      <DirectBanner
        imageUrl={banner.imageUrl}
        href={banner.href || "/promotion"}
        alt={banner.alt || label}
        width={width}
        height={height}
        className={className}
        objectFit={objectFit}
      />
    );
  }

  const slot = adsenseKind ? adSlot(adsenseKind) : undefined;
  if (slot) {
    return (
      <AdSenseUnit
        slot={slot}
        label={label}
        className={className}
        width={width}
        height={height}
        format={format}
        responsive={responsive}
      />
    );
  }

  if (fallback) return fallback;

  return (
    <AdSenseUnit
      label={label}
      className={className}
      width={width}
      height={height}
      format={format}
      responsive={responsive}
    />
  );
}
