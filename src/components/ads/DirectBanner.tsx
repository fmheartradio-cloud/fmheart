type DirectBannerProps = {
  imageUrl: string;
  href?: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  objectFit?: "cover" | "contain";
};

export function DirectBanner({
  imageUrl,
  href,
  alt = "Advertisement",
  width,
  height,
  className = "",
  objectFit = "cover",
}: DirectBannerProps) {
  const sized = Boolean(width && height);
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={`${sized ? "h-full w-full" : "h-auto w-full"} ${
        objectFit === "contain" ? "object-contain" : "object-cover"
      }`}
    />
  );

  const box = (
    <div
      className={`overflow-hidden bg-neutral-100 ${className}`}
      style={
        sized
          ? { width, height, maxWidth: "100%" }
          : undefined
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
      className="block max-w-full"
      aria-label={alt}
    >
      {box}
    </a>
  );
}
