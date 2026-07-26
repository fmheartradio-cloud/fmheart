import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { videos } from "@/data/mock";

export const metadata: Metadata = {
  title: "Videos",
  description: "FM Heart video highlights — shows, interviews & studio clips.",
};

export default function VideosPage() {
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <TopBar />
      <Header />
      <main className="mx-auto max-w-7xl px-3 py-8 md:px-4">
        <div className="mb-6 flex items-end justify-between border-b-2 border-fh-red pb-2">
          <h1 className="font-heading text-2xl font-extrabold md:text-3xl">
            වීඩියෝ
          </h1>
          <Link href="/live" className="text-sm font-semibold text-fh-red hover:underline">
            Live Radio →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {videos.map((v) => (
            <article key={v.id} className="group min-w-0">
              <div className="relative aspect-video overflow-hidden bg-neutral-200">
                <Image
                  src={v.thumbnail}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 25vw"
                />
                <span className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {v.duration}
                </span>
              </div>
              <h2 className="mt-2 font-heading text-[15px] font-bold leading-snug group-hover:text-fh-red">
                {v.title}
              </h2>
              <p className="mt-1 text-xs text-fh-muted">
                {v.views} views · {v.publishedAt}
              </p>
            </article>
          ))}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
