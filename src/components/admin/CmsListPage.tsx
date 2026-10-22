"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  deleteCmsItem,
  listCmsItems,
  saveCmsItem,
  type CmsListItem,
  type ListKey,
} from "@/services/lists";

export type ListField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "textarea" | "select" | "url" | "time";
  options?: string[];
  required?: boolean;
};

const FIELD =
  "mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base outline-none focus:ring-2 focus:ring-fh-red";

export function CmsListPage({
  listKey,
  title,
  hint,
  fields,
}: {
  listKey: ListKey;
  title: string;
  hint: string;
  fields: ListField[];
}) {
  const [items, setItems] = useState<CmsListItem[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  function blank() {
    return Object.fromEntries(fields.map((f) => [f.key, ""]));
  }

  async function refresh() {
    const list = await listCmsItems(listKey);
    setItems(list);
    setLoaded(true);
  }

  useEffect(() => {
    void refresh().catch((err) => {
      setMsg(err instanceof Error ? err.message : "Load failed");
      setLoaded(true);
    });
  }, [listKey]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await saveCmsItem(listKey, form, editingId);
      setForm(blank());
      setEditingId(undefined);
      setMsg("Saved ✓");
      await refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-fh-muted">{hint}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <form
          onSubmit={onSave}
          className="space-y-3 rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5"
        >
          <h2 className="font-heading text-lg font-bold">
            {editingId ? "Edit" : "Add new"}
          </h2>
          {fields.map((field) => (
            <label key={field.key} className="block text-sm font-semibold">
              {field.label}
              {field.type === "textarea" ? (
                <textarea
                  required={field.required}
                  rows={5}
                  placeholder={field.placeholder}
                  value={form[field.key] || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [field.key]: e.target.value }))
                  }
                  className={FIELD}
                />
              ) : field.type === "select" ? (
                <select
                  required={field.required}
                  value={form[field.key] || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [field.key]: e.target.value }))
                  }
                  className={FIELD}
                >
                  <option value="">Select…</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  required={field.required}
                  type={field.type === "url" ? "url" : field.type === "time" ? "time" : "text"}
                  placeholder={field.placeholder}
                  value={form[field.key] || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [field.key]: e.target.value }))
                  }
                  className={FIELD}
                />
              )}
            </label>
          ))}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 flex-1 rounded-full bg-fh-red font-heading text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? "Saving…" : editingId ? "Update" : "Save"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="min-h-11 rounded-full border px-4 text-sm font-semibold"
                onClick={() => {
                  setEditingId(undefined);
                  setForm(blank());
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
          {msg ? <p className="text-sm text-fh-muted">{msg}</p> : null}
        </form>

        <div className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
          <h2 className="font-heading text-lg font-bold">
            {loaded ? `Items (${items.length})` : "Loading…"}
          </h2>
          <ul className="mt-3 divide-y divide-neutral-100">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-heading text-sm font-bold">
                    {item.title || "Untitled"}
                  </p>
                  <p className="truncate text-xs text-fh-muted">
                    {fields
                      .filter((f) => f.key !== "title" && item[f.key])
                      .slice(0, 3)
                      .map((f) => item[f.key])
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="text-xs font-bold text-fh-red"
                    onClick={() => {
                      setEditingId(item.id);
                      setForm(
                        Object.fromEntries(
                          fields.map((f) => [f.key, item[f.key] || ""]),
                        ),
                      );
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold text-neutral-500"
                    onClick={async () => {
                      if (!confirm("Delete?")) return;
                      await deleteCmsItem(listKey, item.id);
                      await refresh();
                    }}
                  >
                    Del
                  </button>
                </div>
              </li>
            ))}
            {loaded && items.length === 0 ? (
              <li className="py-6 text-sm text-fh-muted">Nothing saved yet.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
