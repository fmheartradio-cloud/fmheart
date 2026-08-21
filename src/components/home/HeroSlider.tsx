"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { heroSlides as mockSlides } from "@/data/mock";
import type { Article } from "@/types";

type HeroSliderProps = {
  slides?: Article[];
};

export function HeroSlider({ slides: initialSlides }: HeroSliderProps) {
  const slides =
    initialSlides && initialSlides.length > 0 ? initialSlides : mockSlides;
  const [index, setIndex] = useState(0);
  const slide = slides[index] ?? slides[0];
  const slideKey = slides.map((s) => s.id).join(",");

  useEffect(() => {
    setIndex(0);
  }, [slideKey]);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 6500);
    return () => clearInterval(id);
  }, [slides.length, slideKey]);

  if (!slide) return null;

  return (
    <section className="relative min-h-[280px] w-full max-w-full min-w-0 overflow-hidden bg-fh-black md:min-h-[420px] lg:min-h-[480px]">
      {slides.map((item, i) => (
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
            unoptimized
            className="object-cover"
            sizes="(max-width: 1024px) calc(100vw - 1.5rem), 70vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/20" />
          <div
            className="pointer-events-none absolute top-3 left-3 z-[1] w-[20%] max-w-[110px] md:top-4 md:left-4 md:w-[15%] md:max-w-[140px] lg:max-w-[155px]"
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
        </div>
      ))}

      <div className="relative z-10 flex h-full min-h-[280px] flex-col justify-end p-4 md:min-h-[420px] md:p-8 lg:min-h-[480px]">
        <h1 className="font-hero animate-fade-up max-w-3xl text-2xl leading-snug text-white md:text-4xl lg:text-[2.75rem]">
          {slide.title}
        </h1>
        <div className="mt-4 flex items-center gap-4">
          <Link
            href={`/news/${slide.slug}`}
            className="inline-flex bg-fh-red px-5 py-2.5 font-heading text-sm font-bold tracking-wide text-white transition hover:bg-fh-red-dark"
          >
            READ MORE
          </Link>
          <div className="flex gap-2">
            {slides.map((_, i) => (
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
