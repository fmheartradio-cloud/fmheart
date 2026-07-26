"use client";

import { useEffect, useRef } from "react";

type AdSenseUnitProps = {
  slot?: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  className?: string;
  label?: string;
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

  if (!ready) {
    return (
      <aside
        className={`flex min-h-[90px] items-center justify-center border border-dashed border-neutral-300 bg-fh-surface text-center ${className}`}
        aria-label={label}
      >
        <div className="px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-fh-muted">
            Google AdSense
          </p>
          <p className="mt-1 font-heading text-sm font-semibold text-neutral-500">
            {label}
          </p>
        </div>
      </aside>
    );
  }

  return (
    <ins
      className={`adsbygoogle block ${className}`}
      style={{ display: "block" }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
