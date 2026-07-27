"use client";

import { useEffect, useState, type FormEvent } from "react";
import { listArticles } from "@/services/articles";
import {
  articleToHeroInput,
  emptyHeroSlide,
  getCmsHeroSlides,
  saveHeroSlides,
  type HeroSlideInput,
} from "@/services/hero";
import type { CmsArticle } from "@/types/cms";
import { heroSlides as mockHero } from "@/data/mock";

export default function AdminHeroPage() {
  const [articles, setArticles] = useState<CmsArticle[]>([]);
  const [heroSlidesForm, setHeroSlidesForm] = useState<HeroSlideInput[]>(
    mockHero.map(articleToHeroInput),
  );
  const [heroMsg, setHeroMsg] = useState<string | null>(null);
  const [heroBusy, setHeroBusy] = useState(false);

  useEffect(() => {
    void Promise.all([
      listArticles({ status: "all", limit: 50 }),
      getCmsHeroSlides(),
    ]).then(([items, hero]) => {
      setArticles(items);
      setHeroSlidesForm(
        hero.length > 0
          ? hero.map(articleToHeroInput)
          : [emptyHeroSlide(), emptyHeroSlide(), emptyHeroSlide()],
      );
    });
  }, []);

  async function handleSaveHero(e: FormEvent) {
    e.preventDefault();
    setHeroBusy(true);
    setHeroMsg(null);
    try {
      const saved = await saveHeroSlides(heroSlidesForm);
      setHeroSlidesForm(saved.map(articleToHeroInput));
      setHeroMsg("Hero posts updated ✓");
    } catch (err) {
      setHeroMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setHeroBusy(false);
    }
  }

  function updateHeroSlide(index: number, patch: Partial<HeroSlideInput>) {
    setHeroSlidesForm((prev) =>
      prev.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)),
    );
  }

  function fillHeroFromArticle(index: number, articleId: string) {
    const article = articles.find((a) => a.id === articleId);
    if (!article) return;
    updateHeroSlide(index, articleToHeroInput(article));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold md:text-3xl">
          Hero Posts
        </h1>
        <p className="mt-1 text-sm text-fh-muted">
          Homepage slider දැන් නවතම published news 10 ස්වයංක්‍රීයව පෙන්වයි.
          මෙහි slides CMS backup / legacy — public homepage එක ignore කරයි.
        </p>
      </div>

      <form
        onSubmit={handleSaveHero}
        className="space-y-4 border border-neutral-200 bg-white p-5"
      >
        {heroSlidesForm.map((slide, i) => (
          <div key={i} className="space-y-2 border border-neutral-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-heading text-sm font-bold">Slide {i + 1}</p>
              <select
                className="max-w-full border border-neutral-300 px-2 py-1.5 text-xs"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) fillHeroFromArticle(i, e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">Fill from article…</option>
                {articles
                  .filter((a) => a.status === "published")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.type}] {a.title.slice(0, 60)}
                    </option>
                  ))}
              </select>
            </div>
            <input
              required
              placeholder="Title"
              value={slide.title}
              onChange={(e) => updateHeroSlide(i, { title: e.target.value })}
              className="w-full border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Excerpt (optional)"
              value={slide.excerpt || ""}
              onChange={(e) => updateHeroSlide(i, { excerpt: e.target.value })}
              className="w-full border border-neutral-300 px-3 py-2 text-sm"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                required
                placeholder="Category"
                value={slide.category}
                onChange={(e) =>
                  updateHeroSlide(i, { category: e.target.value })
                }
                className="w-full border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Slug (article URL slug)"
                value={slide.slug}
                onChange={(e) => updateHeroSlide(i, { slug: e.target.value })}
                className="w-full border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <input
              required
              placeholder="Image URL"
              value={slide.image}
              onChange={(e) => updateHeroSlide(i, { image: e.target.value })}
              className="w-full border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="border border-neutral-300 px-3 py-2 text-sm"
            onClick={() =>
              setHeroSlidesForm((prev) =>
                prev.length < 10 ? [...prev, emptyHeroSlide()] : prev,
              )
            }
          >
            + Add slide
          </button>
          {heroSlidesForm.length > 1 && (
            <button
              type="button"
              className="border border-neutral-300 px-3 py-2 text-sm text-fh-muted"
              onClick={() => setHeroSlidesForm((prev) => prev.slice(0, -1))}
            >
              Remove last
            </button>
          )}
          <button
            type="submit"
            disabled={heroBusy}
            className="bg-fh-red px-5 py-2.5 font-heading text-sm font-bold text-white disabled:opacity-60"
          >
            {heroBusy ? "Saving…" : "Save Hero Posts"}
          </button>
        </div>
        {heroMsg && <p className="text-sm text-fh-muted">{heroMsg}</p>}
      </form>
    </div>
  );
}
