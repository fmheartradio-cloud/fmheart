import Link from "next/link";

const categories = [
  { name: "ලෝක පුවත්", letter: "ලෝ", href: "/news/world" },
  { name: "ව්‍යාපාර", letter: "ව්‍යා", href: "/news/business" },
  { name: "ක්‍රීඩා", letter: "ක්‍රී", href: "/news/sports" },
  { name: "තාක්ෂණය", letter: "තා", href: "/news/tech" },
  { name: "සෞඛ්‍ය", letter: "සෞ", href: "/news/health" },
  { name: "ජීවන රටාව", letter: "ජී", href: "/news/lifestyle" },
];

export function CategoryIcons() {
  return (
    <section aria-label="Categories">
      <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-6 md:overflow-visible">
        {categories.map((cat) => (
          <Link
            key={cat.href}
            href={cat.href}
            className="flex min-w-[96px] flex-col items-center gap-2 border border-neutral-200 bg-white px-3 py-4 text-center transition hover:border-fh-red hover:shadow-sm"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-fh-red/10 font-heading text-sm font-extrabold text-fh-red">
              {cat.letter}
            </span>
            <span className="font-heading text-xs font-bold text-fh-ink">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
