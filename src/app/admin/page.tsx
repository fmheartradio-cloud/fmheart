"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { isAdminEmail, PRIMARY_ADMIN_EMAIL } from "@/lib/admin";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  deleteArticle,
  listArticles,
  saveArticle,
  slugify,
} from "@/services/articles";
import {
  getBreakingHeadlines,
  saveBreakingHeadlines,
} from "@/services/breaking";
import {
  articleToHeroInput,
  emptyHeroSlide,
  getHeroSlides,
  saveHeroSlides,
  type HeroSlideInput,
} from "@/services/hero";
import type { CmsArticle, CmsArticleInput, ContentType } from "@/types/cms";
import { breakingHeadlines as mockHeadlines, heroSlides as mockHero } from "@/data/mock";

const emptyForm: CmsArticleInput = {
  type: "news",
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  category: "දේශීය",
  coverImage: "",
  author: "FM Heart Desk",
  status: "published",
  tags: [],
};

export default function AdminCmsPage() {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState(PRIMARY_ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [articles, setArticles] = useState<CmsArticle[]>([]);
  const [form, setForm] = useState<CmsArticleInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [denied, setDenied] = useState(false);
  const [breakingText, setBreakingText] = useState(mockHeadlines.join("\n"));
  const [breakingMsg, setBreakingMsg] = useState<string | null>(null);
  const [breakingBusy, setBreakingBusy] = useState(false);
  const [heroSlidesForm, setHeroSlidesForm] = useState<HeroSlideInput[]>(
    mockHero.map(articleToHeroInput),
  );
  const [heroMsg, setHeroMsg] = useState<string | null>(null);
  const [heroBusy, setHeroBusy] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const auth = getFirebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, async (next) => {
      if (next && !isAdminEmail(next.email)) {
        setDenied(true);
        setUser(null);
        await signOut(auth);
        return;
      }
      setDenied(false);
      setUser(next);
    });
  }, [configured]);

  useEffect(() => {
    if (user) void refresh();
  }, [user]);

  async function refresh() {
    const [items, breaking, hero] = await Promise.all([
      listArticles({ status: "all", limit: 50 }),
      getBreakingHeadlines(),
      getHeroSlides(),
    ]);
    setArticles(items);
    setBreakingText(breaking.join("\n"));
    setHeroSlidesForm(
      hero.length > 0
        ? hero.map(articleToHeroInput)
        : [emptyHeroSlide(), emptyHeroSlide(), emptyHeroSlide()],
    );
  }

  async function handleSaveBreaking(e: FormEvent) {
    e.preventDefault();
    setBreakingBusy(true);
    setBreakingMsg(null);
    try {
      const lines = breakingText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const saved = await saveBreakingHeadlines(lines);
      setBreakingText(saved.join("\n"));
      setBreakingMsg("Breaking news updated ✓");
    } catch (err) {
      setBreakingMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBreakingBusy(false);
    }
  }

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

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    const auth = getFirebaseAuth();
    if (!auth) return;
    if (!isAdminEmail(email)) {
      setMessage(`Access තියෙන්නේ admin emails වලට විතරයි (${PRIMARY_ADMIN_EMAIL})`);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    const auth = getFirebaseAuth();
    if (!auth) return;
    setBusy(true);
    setMessage(null);
    setDenied(false);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account", login_hint: PRIMARY_ADMIN_EMAIL });
      const result = await signInWithPopup(auth, provider);
      if (!isAdminEmail(result.user.email)) {
        await signOut(auth);
        setDenied(true);
        setMessage(
          `${result.user.email} ට access නැහැ. ${PRIMARY_ADMIN_EMAIL} එකෙන් login වෙන්න.`,
        );
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Google login failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const payload: CmsArticleInput = {
        ...form,
        slug: form.slug || slugify(form.title),
        tags: tagInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      // Force auto slug if user left Sinhala title in slug field
      if (
        !payload.slug ||
        payload.slug.length > 80 ||
        /\s/.test(payload.slug) ||
        /[^\u0000-\u007f]/.test(payload.slug)
      ) {
        payload.slug = slugify(payload.title);
      }
      await saveArticle(payload, editingId);
      setMessage(editingId ? "Updated ✓" : "Published/Saved ✓");
      setForm(emptyForm);
      setTagInput("");
      setEditingId(undefined);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(article: CmsArticle) {
    setEditingId(article.id);
    setForm({
      type: article.type,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      body: article.body,
      category: article.category,
      coverImage: article.coverImage,
      author: article.author,
      status: article.status,
      tags: article.tags,
      seoTitle: article.seoTitle,
      seoDescription: article.seoDescription,
    });
    setTagInput(article.tags.join(", "));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!configured) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="font-heading text-3xl font-extrabold">CMS Setup</h1>
        <p className="mt-3 text-fh-muted">
          Firebase config තවම `.env.local` එකේ නැහැ. Admin:{" "}
          <code className="text-fh-red">{PRIMARY_ADMIN_EMAIL}</code>
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
          <li>
            Firebase project එක <strong>{PRIMARY_ADMIN_EMAIL}</strong> එකෙන්
            create / own කරන්න
          </li>
          <li>Authentication → Google + Email/Password enable කරන්න</li>
          <li>Web app config → `.env.local`</li>
          <li>
            <code>npx firebase deploy --only firestore:rules,storage</code>
          </li>
        </ol>
        <Link href="/" className="mt-6 inline-block text-fh-red hover:underline">
          ← Homepage
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <h1 className="font-heading text-3xl font-extrabold">FM Heart CMS</h1>
        <p className="mt-2 text-sm text-fh-muted">
          Admin access: <span className="text-fh-ink">{PRIMARY_ADMIN_EMAIL}</span>
        </p>

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleGoogleLogin()}
          className="mt-6 flex w-full items-center justify-center gap-2 border border-neutral-300 bg-white py-3 font-heading text-sm font-bold transition hover:bg-fh-surface disabled:opacity-60"
        >
          <span aria-hidden>G</span>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-fh-muted">
          <span className="h-px flex-1 bg-neutral-200" />
          or email / password
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-fh-red"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-fh-red"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-fh-red py-2.5 font-heading font-bold text-white disabled:opacity-60"
          >
            {busy ? "…" : "Login"}
          </button>
        </form>
        {(message || denied) && (
          <p className="mt-3 text-sm text-fh-red">
            {message ||
              `Access denied. ${PRIMARY_ADMIN_EMAIL} එකෙන් පමණක් CMS open කරන්න.`}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fh-surface">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-heading text-xl font-extrabold">FM Heart CMS</h1>
            <p className="text-xs text-fh-muted">
              {user.email} · Admin
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="text-sm hover:text-fh-red">
              Site
            </Link>
            <button
              type="button"
              className="text-sm text-fh-red"
              onClick={() => {
                const auth = getFirebaseAuth();
                if (auth) void signOut(auth);
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <form
            onSubmit={handleSaveBreaking}
            className="space-y-3 bg-white p-5 shadow-sm"
          >
            <h2 className="font-heading text-lg font-bold">Breaking News</h2>
            <p className="text-xs text-fh-muted">
              Top ticker headlines — එක පේළියකට එකක්. Save කළාම site එකේ
              BREAKING bar එක update වෙයි.
            </p>
            <textarea
              required
              rows={5}
              value={breakingText}
              onChange={(e) => setBreakingText(e.target.value)}
              placeholder={"Headline 1\nHeadline 2\nHeadline 3"}
              className="w-full border border-neutral-300 px-3 py-2 font-sans text-sm"
            />
            <button
              type="submit"
              disabled={breakingBusy}
              className="bg-fh-red px-5 py-2.5 font-heading text-sm font-bold text-white disabled:opacity-60"
            >
              {breakingBusy ? "Saving…" : "Save Breaking News"}
            </button>
            {breakingMsg && (
              <p className="text-sm text-fh-muted">{breakingMsg}</p>
            )}
          </form>

          <form
            onSubmit={handleSaveHero}
            className="space-y-4 bg-white p-5 shadow-sm"
          >
            <div>
              <h2 className="font-heading text-lg font-bold">Hero Posts</h2>
              <p className="mt-1 text-xs text-fh-muted">
                Homepage slider — slides 1–3. Published article එකකින් fill
                කරන්න පුළුවන්, නැත්නම් manually edit කරන්න.
              </p>
            </div>

            {heroSlidesForm.map((slide, i) => (
              <div
                key={i}
                className="space-y-2 border border-neutral-200 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-heading text-sm font-bold">
                    Slide {i + 1}
                  </p>
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
                  onChange={(e) =>
                    updateHeroSlide(i, { title: e.target.value })
                  }
                  className="w-full border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Excerpt (optional)"
                  value={slide.excerpt || ""}
                  onChange={(e) =>
                    updateHeroSlide(i, { excerpt: e.target.value })
                  }
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
                    onChange={(e) =>
                      updateHeroSlide(i, { slug: e.target.value })
                    }
                    className="w-full border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
                <input
                  required
                  placeholder="Image URL"
                  value={slide.image}
                  onChange={(e) =>
                    updateHeroSlide(i, { image: e.target.value })
                  }
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
                    prev.length < 5 ? [...prev, emptyHeroSlide()] : prev,
                  )
                }
              >
                + Add slide
              </button>
              {heroSlidesForm.length > 1 && (
                <button
                  type="button"
                  className="border border-neutral-300 px-3 py-2 text-sm text-fh-muted"
                  onClick={() =>
                    setHeroSlidesForm((prev) => prev.slice(0, -1))
                  }
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

        <form onSubmit={handleSave} className="space-y-3 bg-white p-5 shadow-sm">
          <h2 className="font-heading text-lg font-bold">
            {editingId ? "Edit Article" : "New Article"}
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Type
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as ContentType }))
                }
                className="mt-1 w-full border border-neutral-300 px-3 py-2"
              >
                <option value="news">News</option>
                <option value="gossip">Gossip</option>
              </select>
            </label>
            <label className="text-sm">
              Status
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as CmsArticleInput["status"],
                  }))
                }
                className="mt-1 w-full border border-neutral-300 px-3 py-2"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>

          <input
            required
            placeholder="Title (සිංහල)"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Slug (optional)"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            className="w-full border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Cover image URL"
            value={form.coverImage}
            onChange={(e) =>
              setForm((f) => ({ ...f, coverImage: e.target.value }))
            }
            className="w-full border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Author"
            value={form.author}
            onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
            className="w-full border border-neutral-300 px-3 py-2 text-sm"
          />
          <textarea
            required
            rows={2}
            placeholder="Excerpt"
            value={form.excerpt}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            className="w-full border border-neutral-300 px-3 py-2 text-sm"
          />
          <textarea
            required
            rows={10}
            placeholder="Body (සිංහල article)"
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            className="w-full border border-neutral-300 px-3 py-2 font-article text-sm"
          />
          <input
            placeholder="Tags (comma separated)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            className="w-full border border-neutral-300 px-3 py-2 text-sm"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="bg-fh-red px-5 py-2.5 font-heading text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? "Saving…" : editingId ? "Update" : "Save"}
            </button>
            {editingId && (
              <button
                type="button"
                className="border border-neutral-300 px-4 py-2.5 text-sm"
                onClick={() => {
                  setEditingId(undefined);
                  setForm(emptyForm);
                  setTagInput("");
                }}
              >
                Cancel
              </button>
            )}
          </div>
          {message && <p className="text-sm text-fh-muted">{message}</p>}
        </form>
        </div>

        <div className="bg-white p-5 shadow-sm">
          <h2 className="font-heading text-lg font-bold">
            Articles ({articles.length})
          </h2>
          <ul className="mt-4 divide-y divide-neutral-100">
            {articles.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-heading text-sm font-bold">
                    {a.title}
                  </p>
                  <p className="text-xs text-fh-muted">
                    {a.type} · {a.status} · {a.category}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 text-xs">
                  <button
                    type="button"
                    className="text-fh-red"
                    onClick={() => startEdit(a)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-neutral-500"
                    onClick={async () => {
                      if (!confirm("Delete?")) return;
                      try {
                        await deleteArticle(a.id);
                        await refresh();
                      } catch (err) {
                        setMessage(
                          err instanceof Error ? err.message : "Delete failed",
                        );
                      }
                    }}
                  >
                    Del
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
