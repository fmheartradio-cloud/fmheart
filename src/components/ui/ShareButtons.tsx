type ShareButtonsProps = {
  url: string;
  title: string;
  className?: string;
};

const btnBase =
  "inline-flex items-center justify-center rounded-md px-3.5 py-2 font-heading text-xs font-bold tracking-wide text-white shadow-[0_3px_8px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(0,0,0,0.28)] active:translate-y-0";

export function ShareButtons({ url, title, className = "" }: ShareButtonsProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${title} ${url}`);
  const encodedTitle = encodeURIComponent(title);

  const items = [
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      className: "bg-[#3b5998] hover:bg-[#334b82]",
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedText}`,
      className: "bg-[#25d366] hover:bg-[#1ebe57]",
    },
    {
      label: "Messenger",
      href: `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=291494419107518&redirect_uri=${encodedUrl}`,
      className: "bg-[#0084ff] hover:bg-[#0073e0]",
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      className: "bg-[#37aee2] hover:bg-[#2b9dcf]",
    },
    {
      label: "Twitter",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      className: "bg-[#1da1f2] hover:bg-[#0d8ddb]",
    },
    {
      label: "Email",
      href: `mailto:?subject=${encodedTitle}&body=${encodedText}`,
      className: "bg-[#ea4335] hover:bg-[#d33426]",
    },
  ] as const;

  return (
    <div className={`border-t border-neutral-200 pt-6 ${className}`}>
      <p className="mb-3 font-heading text-sm font-semibold text-fh-ink">Share</p>
      <div className="flex flex-wrap gap-2.5">
        {items.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target={item.label === "Email" ? undefined : "_blank"}
            rel={item.label === "Email" ? undefined : "noopener noreferrer"}
            className={`${btnBase} ${item.className}`}
          >
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
}
