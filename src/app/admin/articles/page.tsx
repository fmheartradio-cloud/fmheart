"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  deleteArticle,
  listArticles,
  postArticleToFacebook,
  saveArticle,
  setArticleStatus,
  slugify,
} from "@/services/articles";
import type { CmsArticle, CmsArticleInput, ContentType } from "@/types/cms";

const PAGE_SIZE = 10;

const ARTICLE_CATEGORIES = [
  "දේශීය",
  "දේශපාලන",
  "ව්‍යාපාර",
  "ව්‍යාපාරික",
  "ක්‍රීඩා",
  "විදෙස්",
  "ලෝක පුවත්",
  "තාක්ෂණය",
  "සෞඛ්‍ය",
  "ජීවන රටාව",
] as const;

const FIELD =
  "mt-1 w-full border border-neutral-300 bg-white px-3 py-3 text-base outline-none focus:ring-2 focus:ring-fh-red";

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
  ingestedBy: "manual",
};

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<CmsArticle[]>([]);
  const [form, setForm] = useState<CmsArticleInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [filter, setFilter] = useState<"all" | "draft" | "published">("all");
  const [page, setPage] = useState(1);
  const [postToFacebook, setPostToFacebook] = useState(true);
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<"list" | "form">("list");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<CmsArticle | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refresh() {
    const items = await listArticles({ status: "all", limit: 200 });
    setArticles(items);
  }

  function matchesCategory(article: CmsArticle, cat: string) {
    if (cat === "all") return true;
    if (cat === "gossip") return article.type === "gossip";
    if (article.type === "gossip") return false;
    return (article.category || "").trim() === cat;
  }

  const extraCategories = [
    ...new Set(
      articles
        .filter((a) => a.type === "news")
        .map((a) => (a.category || "").trim())
        .filter(
          (c) =>
            c && !(ARTICLE_CATEGORIES as readonly string[]).includes(c),
        ),
    ),
  ].sort((a, b) => a.localeCompare(b, "si"));

  const categoryTabs = [
    { id: "all", label: "All" },
    { id: "gossip", label: "Gossip" },
    ...ARTICLE_CATEGORIES.map((id) => ({ id, label: id })),
    ...extraCategories.map((id) => ({ id, label: id })),
  ];

  const visible = articles.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (!matchesCategory(a, categoryFilter)) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      (a.source || "").toLowerCase().includes(q)
    );
  });
  const draftCount = articles.filter((a) => a.status === "draft").length;
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = visible.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const rangeStart = visible.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, visible.length);
  const categoryOptions = ARTICLE_CATEGORIES.includes(
    form.category as (typeof ARTICLE_CATEGORIES)[number],
  )
    ? ARTICLE_CATEGORIES
    : ([form.category, ...ARTICLE_CATEGORIES] as readonly string[]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
    void refresh();
  }, []);

  async function maybePostFacebook(articleId: string, status: string) {
    if (!postToFacebook || status !== "published") return null;
    try {
      const fb = await postArticleToFacebook(articleId);
      if (fb.skipped) return "Facebook: already posted";
      return fb.postUrl
        ? `Facebook posted ✓ ${fb.postUrl}`
        : "Facebook posted ✓";
    } catch (err) {
      return `Facebook failed: ${err instanceof Error ? err.message : "error"}`;
    }
  }

  function resetForm() {
    setEditingId(undefined);
    setForm(emptyForm);
    setTagInput("");
    setPostToFacebook(true);
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
      if (
        !payload.slug ||
        payload.slug.length > 80 ||
        /\s/.test(payload.slug) ||
        /[^\u0000-\u007f]/.test(payload.slug)
      ) {
        payload.slug = slugify(payload.title);
      }
      const saved = await saveArticle(payload, editingId);
      const fbMsg = await maybePostFacebook(saved.id, saved.status);
      setMessage(
        [editingId ? "Updated ✓" : "Published/Saved ✓", fbMsg]
          .filter(Boolean)
          .join(" · "),
      );
      resetForm();
      setPanel("list");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function closeForm() {
    resetForm();
    setPanel("list");
  }

  function startNew() {
    resetForm();
    if (categoryFilter === "gossip") {
      setForm({ ...emptyForm, type: "gossip", category: "Gossip" });
    } else if (categoryFilter !== "all") {
      setForm({ ...emptyForm, category: categoryFilter });
    }
    setMessage(null);
    setPanel("form");
  }

  function askDelete(article: CmsArticle) {
    setPendingDelete(article);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteArticle(pendingDelete.id);
      setMessage("Deleted ✓");
      setPendingDelete(null);
      if (editingId === pendingDelete.id) closeForm();
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Delete failed");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  function startEdit(article: CmsArticle) {
    setEditingId(article.id);
    setPostToFacebook(!article.facebookPostId);
    setForm({
      type: article.type,
      title: article.title,
      source: article.source,
      sourceUrl: article.sourceUrl,
      sourceHash: article.sourceHash,
      ingestedBy: article.ingestedBy ?? "manual",
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
    setMessage(null);
    setPanel("form");
  }

  useEffect(() => {
    const overlayOpen = panel === "form" || Boolean(pendingDelete);
    if (!overlayOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (pendingDelete) {
        setPendingDelete(null);
        return;
      }
      closeForm();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [panel, pendingDelete]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold md:text-3xl">
            News
          </h1>
          <p className="mt-1 text-sm text-fh-muted">
            ලිපියක් edit කරන්න list එකෙන් tap කරන්න.
            {draftCount > 0 ? ` ${draftCount} drafts waiting.` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="min-h-11 bg-fh-red px-4 font-heading text-sm font-bold text-white sm:self-end"
        >
          + New article
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["draft", "Drafts"],
            ["published", "Published"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setFilter(key);
              setPage(1);
            }}
            className={`min-h-10 px-4 font-heading text-sm font-bold ${
              filter === key
                ? "bg-fh-red text-white"
                : "bg-white text-fh-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-fh-muted uppercase">
          News category
        </p>
        <div className="flex flex-wrap gap-2">
          {categoryTabs.map((tab) => {
            const count = articles.filter((a) => {
              if (filter !== "all" && a.status !== filter) return false;
              return matchesCategory(a, tab.id);
            }).length;
            const active = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setCategoryFilter(tab.id);
                  setPage(1);
                }}
                className={`min-h-10 rounded-full px-3 font-heading text-sm font-bold ${
                  active
                    ? "bg-fh-ink text-white"
                    : "bg-white text-fh-ink"
                }`}
              >
                {tab.label}
                <span
                  className={`ml-1.5 text-xs font-semibold ${
                    active ? "text-white/70" : "text-fh-muted"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {panel === "form" ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-6">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close article form"
            onClick={closeForm}
          />
          <form
            onSubmit={handleSave}
            className="relative z-10 my-4 w-full max-w-2xl space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-heading text-lg font-bold">
                {editingId ? "Edit article" : "New article"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-semibold"
              >
                Close
              </button>
            </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Type
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as ContentType,
                  }))
                }
                className={FIELD}
              >
                <option value="news">News</option>
                <option value="gossip">Gossip</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Status
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as CmsArticleInput["status"],
                  }))
                }
                className={FIELD}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>

          <label className="block text-sm font-semibold">
            Title (සිංහල)
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={FIELD}
            />
          </label>
          <label className="block text-sm font-semibold">
            Category
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              className={FIELD}
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Cover image URL
            <input
              required
              type="url"
              inputMode="url"
              value={form.coverImage}
              onChange={(e) =>
                setForm((f) => ({ ...f, coverImage: e.target.value }))
              }
              className={FIELD}
            />
          </label>
          {form.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.coverImage}
              alt=""
              className="max-h-36 w-full object-cover"
            />
          ) : null}
          <label className="block text-sm font-semibold">
            Author
            <input
              value={form.author}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              className={FIELD}
            />
          </label>
          <label className="block text-sm font-semibold">
            Slug (optional)
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className={FIELD}
            />
          </label>
          <label className="block text-sm font-semibold">
            Excerpt
            <textarea
              required
              rows={2}
              value={form.excerpt}
              onChange={(e) =>
                setForm((f) => ({ ...f, excerpt: e.target.value }))
              }
              className={FIELD}
            />
          </label>
          <label className="block text-sm font-semibold">
            Body
            <textarea
              required
              rows={10}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className={`${FIELD} font-article`}
            />
          </label>
          <label className="block text-sm font-semibold">
            Tags (comma separated)
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className={FIELD}
            />
          </label>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={postToFacebook}
              onChange={(e) => setPostToFacebook(e.target.checked)}
              className="mt-0.5 size-5 accent-fh-red"
            />
            <span>
              Post to Facebook when published
              <span className="block text-xs text-fh-muted">
                Needs FACEBOOK_PAGE_ID + PAGE access token in env
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={busy}
              className="min-h-12 flex-1 bg-fh-red px-5 font-heading text-base font-bold text-white disabled:opacity-60"
            >
              {busy ? "Saving…" : editingId ? "Update article" : "Save article"}
            </button>
            <button
              type="button"
              className="min-h-12 border border-neutral-300 px-4 text-sm font-semibold"
              onClick={closeForm}
            >
              Cancel
            </button>
          </div>
          {message ? <p className="text-sm text-fh-muted">{message}</p> : null}
          </form>
        </div>
      ) : null}

      {message && panel === "list" ? (
        <p className="text-sm text-fh-muted">{message}</p>
      ) : null}

      <div className="border border-neutral-200 bg-white p-4 sm:p-5">
          <h2 className="font-heading text-lg font-bold">
            Articles ({visible.length}
            {filter !== "all" ? ` · ${filter}` : ""}
            {categoryFilter !== "all" ? ` · ${categoryFilter}` : ""})
          </h2>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search title / category…"
            className={`${FIELD} mb-1`}
          />
          <p className="mt-1 text-xs text-fh-muted">
            Latest {PAGE_SIZE} per page
            {visible.length > 0
              ? ` · ${rangeStart}–${rangeEnd} of ${visible.length}`
              : ""}
          </p>
          <ul className="mt-3 divide-y divide-neutral-100">
            {paged.map((a) => (
              <li key={a.id} className="py-3">
                <button
                  type="button"
                  onClick={() => startEdit(a)}
                  className="w-full text-left"
                >
                  <p className="font-heading text-sm font-bold leading-snug">
                    {a.title}
                  </p>
                  <p className="mt-1 text-xs text-fh-muted">
                    {a.type} · {a.status} · {a.category}
                    {a.ingestedBy === "newsbot" ? " · bot" : ""}
                    {a.source ? ` · ${a.source}` : ""} · {a.views || 0} views
                    {a.facebookPostId ? " · FB ✓" : ""}
                  </p>
                </button>
                {a.sourceUrl ? (
                  <a
                    href={a.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-fh-red hover:underline"
                  >
                    Source link
                  </a>
                ) : null}
                {a.facebookPostUrl ? (
                  <a
                    href={a.facebookPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-[11px] text-fh-red hover:underline"
                  >
                    Facebook post
                  </a>
                ) : null}
                {a.facebookPostError ? (
                  <p className="text-[11px] text-red-600">
                    FB: {a.facebookPostError}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {a.status === "draft" ? (
                    <button
                      type="button"
                      className="min-h-10 bg-fh-red px-3 font-heading text-xs font-bold text-white"
                      onClick={async () => {
                        try {
                          await setArticleStatus(a.id, "published");
                          let fbMsg: string | null = null;
                          if (postToFacebook) {
                            try {
                              const fb = await postArticleToFacebook(a.id);
                              fbMsg = fb.skipped
                                ? "Facebook: already posted"
                                : "Facebook posted ✓";
                            } catch (err) {
                              fbMsg = `Facebook failed: ${
                                err instanceof Error ? err.message : "error"
                              }`;
                            }
                          }
                          setMessage(
                            ["Published ✓", fbMsg].filter(Boolean).join(" · "),
                          );
                          await refresh();
                        } catch (err) {
                          setMessage(
                            err instanceof Error
                              ? err.message
                              : "Publish failed",
                          );
                        }
                      }}
                    >
                      Publish
                    </button>
                  ) : null}
                  {a.status === "published" ? (
                    <button
                      type="button"
                      className="min-h-10 border border-neutral-300 px-3 font-heading text-xs font-bold"
                      onClick={async () => {
                        try {
                          const fb = await postArticleToFacebook(a.id, {
                            force: Boolean(a.facebookPostId),
                          });
                          setMessage(
                            fb.skipped
                              ? "Facebook: already posted"
                              : "Facebook posted ✓",
                          );
                          await refresh();
                        } catch (err) {
                          setMessage(
                            err instanceof Error
                              ? err.message
                              : "Facebook post failed",
                          );
                        }
                      }}
                    >
                      {a.facebookPostId ? "Repost FB" : "Post FB"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="min-h-10 bg-fh-ink px-3 font-heading text-xs font-bold text-white"
                    onClick={() => startEdit(a)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="min-h-10 px-3 text-xs font-semibold text-neutral-500"
                    onClick={() => askDelete(a)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {visible.length > PAGE_SIZE ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="min-h-10 border border-neutral-300 px-4 font-heading text-xs font-bold disabled:opacity-40"
              >
                Previous
              </button>
              <p className="text-xs text-fh-muted">
                Page {currentPage} / {totalPages}
              </p>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="min-h-10 bg-fh-red px-4 font-heading text-xs font-bold text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
      </div>

      {pendingDelete ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Cancel delete"
            onClick={() => setPendingDelete(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="font-heading text-lg font-extrabold">
              Delete this article?
            </h2>
            <p className="mt-2 text-sm leading-snug text-fh-ink">
              {pendingDelete.title}
            </p>
            <p className="mt-2 text-sm text-fh-muted">
              Yes එක තේරුවොත් මේ ලිපිය ඉවත් වෙනවා. No එකෙන් cancel වෙනවා.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
                className="min-h-12 rounded-full border border-neutral-300 font-heading text-sm font-bold disabled:opacity-60"
              >
                No
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDelete()}
                className="min-h-12 rounded-full bg-fh-red font-heading text-sm font-bold text-white disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Yes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
