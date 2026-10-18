"use client";

import { useEffect, useRef } from "react";

type AdSenseUnitProps = {
  slot?: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  className?: string;
  label?: string;
  width?: number;
  height?: number;
  responsive?: boolean;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSenseUnit({
  slot,
  format = "auto",
  className = "",
  label = "Advertisement",
  width,
  height,
  responsive = true,
}: AdSenseUnitProps) {
  const pushed = useRef(false);
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const ready =
    Boolean(client && slot && !client.includes("YOUR_") && !slot.includes("YOUR_"));

  useEffect(() => {
    if (!ready || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense may be blocked
    }
  }, [ready]);

  const boxStyle =
    width && height
      ? {
          display: "inline-block" as const,
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: "100%",
        }
      : { display: "block" as const, width: "100%", maxWidth: "100%" };

  if (!ready) {
    return (
      <div
        className={`flex min-h-[90px] w-full items-center justify-center border border-dashed border-neutral-300 bg-neutral-100 text-center ${className}`}
        aria-label={label}
        style={{
          display: "flex",
          width: width ? `${width}px` : "100%",
          height: height ? `${height}px` : undefined,
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <div className="px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-fh-muted">
            Google AdSense
          </p>
          <p className="mt-1 font-heading text-sm font-semibold text-neutral-500">
            {label}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ins
      className={`adsbygoogle ${width && height ? "inline-block" : "block w-full"} ${className}`}
      style={boxStyle}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? "true" : "false"}
    />
  );
}
