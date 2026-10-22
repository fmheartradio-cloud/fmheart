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
  const ratio = width && height ? `${width} / ${height}` : undefined;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={`h-full w-full ${
        objectFit === "cover" ? "object-cover" : "object-contain"
      }`}
    />
  );

  const box = (
    <div
      className={`mx-auto overflow-hidden bg-neutral-100 ${className}`}
      style={
        ratio
          ? {
              aspectRatio: ratio,
              width: "100%",
              maxWidth: fill ? "100%" : width,
              height: "auto",
            }
          : { width: "100%" }
      }
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
