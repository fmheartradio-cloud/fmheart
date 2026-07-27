"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  deleteArticle,
  listArticles,
  saveArticle,
  setArticleStatus,
  slugify,
} from "@/services/articles";
import type { CmsArticle, CmsArticleInput, ContentType } from "@/types/cms";

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

  async function refresh() {
    const items = await listArticles({ status: "all", limit: 80 });
    setArticles(items);
  }

  const visible = articles.filter((a) =>
    filter === "all" ? true : a.status === filter,
  );
  const draftCount = articles.filter((a) => a.status === "draft").length;

  useEffect(() => {
    void refresh();
  }, []);

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold md:text-3xl">
          Articles
        </h1>
        <p className="mt-1 text-sm text-fh-muted">
          Manual posts and newsbot articles. Bot ingests publish automatically;
          manual drafts stay draft until you Publish.
          {draftCount > 0 ? ` (${draftCount} drafts waiting)` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
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
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 font-heading text-xs font-bold ${
                filter === key
                  ? "bg-fh-red text-white"
                  : "bg-fh-surface text-fh-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={handleSave}
          className="space-y-3 border border-neutral-200 bg-white p-5"
        >
          <h2 className="font-heading text-lg font-bold">
            {editingId ? "Edit Article" : "New Article"}
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Type
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as ContentType,
                  }))
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
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
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
            onChange={(e) =>
              setForm((f) => ({ ...f, excerpt: e.target.value }))
            }
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

        <div className="border border-neutral-200 bg-white p-5">
          <h2 className="font-heading text-lg font-bold">
            Articles ({visible.length}
            {filter !== "all" ? ` · ${filter}` : ""})
          </h2>
          <ul className="mt-4 divide-y divide-neutral-100">
            {visible.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-heading text-sm font-bold">
                    {a.title}
                  </p>
                  <p className="text-xs text-fh-muted">
                    {a.type} · {a.status} · {a.category}
                    {a.ingestedBy === "newsbot" ? " · bot" : ""}
                    {a.source ? ` · ${a.source}` : ""} · {a.views || 0} views
                  </p>
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
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                  {a.status === "draft" ? (
                    <button
                      type="button"
                      className="font-bold text-fh-red"
                      onClick={async () => {
                        try {
                          await setArticleStatus(a.id, "published");
                          setMessage("Published ✓");
                          await refresh();
                        } catch (err) {
                          setMessage(
                            err instanceof Error ? err.message : "Publish failed",
                          );
                        }
                      }}
                    >
                      Publish
                    </button>
                  ) : null}
                  <div className="flex gap-2">
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
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
