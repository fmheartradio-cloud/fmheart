type AdSlotProps = {
  label?: string;
  size?: "banner" | "sidebar" | "inline" | "sticky";
  className?: string;
};

const sizeClasses = {
  banner: "min-h-[90px] w-full",
  sidebar: "min-h-[250px] w-full",
  inline: "min-h-[100px] w-full",
  sticky: "min-h-[50px] w-full",
};

export function AdSlot({
  label = "Advertisement",
  size = "banner",
  className = "",
}: AdSlotProps) {
  return (
    <aside
      className={`flex items-center justify-center border border-dashed border-neutral-300 bg-fh-surface text-center ${sizeClasses[size]} ${className}`}
      aria-label={label}
    >
      <div className="px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-fh-muted">
          AdSense / Direct Ad
        </p>
        <p className="mt-1 font-heading text-sm font-semibold text-neutral-500">
          {label}
        </p>
      </div>
    </aside>
  );
}
