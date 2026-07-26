"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { heroSlides } from "@/data/mock";

export function HeroSlider() {
  const [index, setIndex] = useState(0);
  const slide = heroSlides[index];

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % heroSlides.length);
    }, 6500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-[280px] overflow-hidden bg-fh-black md:min-h-[420px] lg:min-h-[480px]">
      {heroSlides.map((item, i) => (
        <div
          key={item.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={item.image}
            alt=""
            fill
            priority={i === 0}
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 70vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/20" />
        </div>
      ))}

      <div className="relative z-10 flex h-full min-h-[280px] flex-col justify-end p-4 md:min-h-[420px] md:p-8 lg:min-h-[480px]">
        <span className="mb-3 inline-flex w-fit bg-fh-red px-3 py-1 font-heading text-xs font-extrabold tracking-wider text-white uppercase">
          {slide.category}
        </span>
        <h1 className="font-davasa animate-fade-up max-w-3xl text-2xl font-bold leading-snug text-white md:text-4xl lg:text-[2.75rem]">
          {slide.title}
        </h1>
        {slide.excerpt && (
          <p className="mt-2 max-w-2xl font-article text-sm text-white/85 md:text-base">
            {slide.excerpt}
          </p>
        )}
        <div className="mt-4 flex items-center gap-4">
          <Link
            href={`/news/${slide.slug}`}
            className="inline-flex bg-fh-red px-5 py-2.5 font-heading text-sm font-bold tracking-wide text-white transition hover:bg-fh-red-dark"
          >
            READ MORE
          </Link>
          <div className="flex gap-2">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  i === index ? "bg-fh-red" : "bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
