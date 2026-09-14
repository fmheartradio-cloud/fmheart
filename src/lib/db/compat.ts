import { randomBytes } from "crypto";
import { ensureSchema, isDbConfigured } from "@/lib/db/client";

export { isDbConfigured } from "@/lib/db/client";

type JsonDoc = Record<string, unknown>;

type Filter = { field: string; value: unknown };

type QuerySnap = {
  empty: boolean;
  docs: CompatDoc[];
};

export type CompatDoc = {
  id: string;
  exists: boolean;
  data: () => JsonDoc;
  ref: CompatRef;
};

type CompatRef = {
  id: string;
  get: () => Promise<CompatDoc>;
  set: (data: JsonDoc, opts?: { merge?: boolean }) => Promise<void>;
  update: (data: JsonDoc) => Promise<void>;
  delete: () => Promise<void>;
};

function assertField(field: string): string {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(field)) {
    throw new Error(`Invalid field: ${field}`);
  }
  return field;
}

function parseJson(raw: string): JsonDoc {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonDoc)
      : {};
  } catch {
    return {};
  }
}

function autoId(): string {
  return randomBytes(12).toString("base64url");
}

function makeDoc(col: string, id: string, data: JsonDoc | null): CompatDoc {
  const exists = data !== null;
  const payload = data || {};
  return {
    id,
    exists,
    data: () => payload,
    ref: makeRef(col, id),
  };
}

function makeRef(col: string, id: string): CompatRef {
  return {
    id,
    async get() {
      const db = await ensureSchema();
      const row = await db.execute({
        sql: "SELECT json FROM docs WHERE col = ? AND id = ? LIMIT 1",
        args: [col, id],
      });
      const raw = row.rows[0]?.json;
      if (typeof raw !== "string") return makeDoc(col, id, null);
      return makeDoc(col, id, parseJson(raw));
    },
    async set(data, opts) {
      const db = await ensureSchema();
      let next = { ...data };
      if (opts?.merge) {
        const current = await this.get();
        if (current.exists) next = { ...current.data(), ...data };
      }
      await db.execute({
        sql: "INSERT INTO docs (col, id, json) VALUES (?, ?, ?) ON CONFLICT(col, id) DO UPDATE SET json = excluded.json",
        args: [col, id, JSON.stringify(next)],
      });
    },
    async update(data) {
      await this.set(data, { merge: true });
    },
    async delete() {
      const db = await ensureSchema();
      await db.execute({
        sql: "DELETE FROM docs WHERE col = ? AND id = ?",
        args: [col, id],
      });
    },
  };
}

class Query {
  private filters: Filter[] = [];
  private order?: { field: string; dir: "asc" | "desc" };
  private limitCount?: number;

  constructor(private col: string) {}

  where(field: string, op: string, value: unknown): Query {
    if (op !== "==") throw new Error(`Unsupported operator: ${op}`);
    this.filters.push({ field: assertField(field), value });
    return this;
  }

  orderBy(field: string, dir: "asc" | "desc" = "asc"): Query {
    this.order = { field: assertField(field), dir };
    return this;
  }

  limit(n: number): Query {
    this.limitCount = n;
    return this;
  }

  async get(): Promise<QuerySnap> {
    const db = await ensureSchema();
    const args: Array<string | number | null> = [this.col];
    let sql = "SELECT id, json FROM docs WHERE col = ?";
    for (const filter of this.filters) {
      sql += ` AND json_extract(json, '$.${filter.field}') = ?`;
      if (
        filter.value === null ||
        typeof filter.value === "string" ||
        typeof filter.value === "number"
      ) {
        args.push(filter.value);
      } else {
        args.push(String(filter.value));
      }
    }
    if (this.order) {
      sql += ` ORDER BY json_extract(json, '$.${this.order.field}') ${
        this.order.dir === "asc" ? "ASC" : "DESC"
      }`;
    }
    if (this.limitCount && this.limitCount > 0) {
      sql += " LIMIT ?";
      args.push(this.limitCount);
    }
    const result = await db.execute({ sql, args });
    const docs = result.rows.map((row) => {
      const id = String(row.id);
      const json = typeof row.json === "string" ? parseJson(row.json) : {};
      return makeDoc(this.col, id, json);
    });
    return { empty: docs.length === 0, docs };
  }

  doc(id: string): CompatRef {
    return makeRef(this.col, id);
  }

  async add(data: JsonDoc): Promise<{ id: string }> {
    const id = autoId();
    await makeRef(this.col, id).set(data);
    return { id };
  }
}

export type CompatDb = {
  collection: (name: string) => Query;
};

let cached: CompatDb | undefined;

export function getAdminDb(): CompatDb | null {
  if (!isDbConfigured()) return null;
  if (cached) return cached;
  cached = {
    collection(name: string) {
      return new Query(name);
    },
  };
  return cached;
}

export function isAdminSdkConfigured(): boolean {
  return isDbConfigured();
}
