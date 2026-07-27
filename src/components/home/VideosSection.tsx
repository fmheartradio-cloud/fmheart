import Image from "next/image";
import Link from "next/link";
import type { VideoItem } from "@/types";

export function VideosSection({ videos }: { videos: VideoItem[] }) {
  return (
    <section className="w-full max-w-full min-w-0 overflow-x-clip">
      <div className="mb-4 flex items-end justify-between gap-3 border-b-2 border-fh-red pb-2">
        <h2 className="font-heading text-xl font-extrabold md:text-2xl">
          වීඩියෝ
        </h2>
        <Link
          href="/videos"
          className="text-xs font-semibold text-fh-red hover:underline md:text-sm"
        >
          සියල්ල බලන්න →
        </Link>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {videos.map((video) => (
          <article key={video.id} className="group min-w-0">
            <Link href={`/videos/${video.slug}`} className="block w-full max-w-full">
              <div className="relative aspect-video overflow-hidden bg-neutral-900">
                <Image
                  src={video.thumbnail}
                  alt=""
                  fill
                  className="object-cover opacity-90 transition group-hover:scale-105 group-hover:opacity-100"
                  sizes="(max-width: 640px) calc(100vw - 1.5rem), 25vw"
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-fh-red/90 text-white shadow-lg transition group-hover:scale-110">
                    ▶
                  </span>
                </span>
                <span className="absolute right-2 bottom-2 bg-black/80 px-1.5 py-0.5 font-mono text-[11px] text-white">
                  {video.duration}
                </span>
              </div>
              <h3 className="mt-2 font-heading text-[15px] font-bold leading-snug group-hover:text-fh-red">
                {video.title}
              </h3>
              <p className="mt-1 text-xs text-fh-muted">
                {video.views} views · {video.publishedAt}
              </p>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
