/**
 * Turso over HTTP (Hrana v2 pipeline). No @libsql/client — that package is
 * externalized by Next and fails on Cloudflare Workers.
 */

export type SqlValue = string | number | null | boolean | Uint8Array;

export type ResultSet = {
  columns: string[];
  rows: Array<Record<string, SqlValue>>;
  rowsAffected: number;
};

type TursoClient = {
  execute: (
    stmt: { sql: string; args?: SqlValue[] } | string,
    args?: SqlValue[],
  ) => Promise<ResultSet>;
  executeMultiple: (sql: string) => Promise<void>;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS docs (
  col TEXT NOT NULL,
  id TEXT NOT NULL,
  json TEXT NOT NULL,
  PRIMARY KEY (col, id)
);
CREATE INDEX IF NOT EXISTS idx_docs_col ON docs(col);
`;

let client: TursoClient | undefined;
let schemaReady = false;

export function isDbConfigured(): boolean {
  return Boolean(
    process.env.TURSO_DATABASE_URL?.trim() &&
      process.env.TURSO_AUTH_TOKEN?.trim(),
  );
}

function toHranaArg(value: SqlValue): Record<string, unknown> {
  if (value === null) return { type: "null" };
  if (typeof value === "boolean") {
    return { type: "integer", value: value ? "1" : "0" };
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return { type: "integer", value: String(value) };
    }
    return { type: "float", value: String(value) };
  }
  if (typeof value === "string") {
    return { type: "text", value };
  }
  if (value instanceof Uint8Array) {
    let bin = "";
    for (let i = 0; i < value.length; i++) bin += String.fromCharCode(value[i]!);
    return { type: "blob", base64: btoa(bin) };
  }
  return { type: "text", value: String(value) };
}

function fromHranaValue(cell: unknown): SqlValue {
  if (cell === null || cell === undefined) return null;
  if (typeof cell !== "object") return cell as SqlValue;
  const c = cell as { type?: string; value?: string; base64?: string };
  switch (c.type) {
    case "null":
      return null;
    case "integer":
      return Number(c.value ?? 0);
    case "float":
      return Number(c.value ?? 0);
    case "text":
      return c.value ?? "";
    case "blob":
      return c.base64 ?? "";
    default:
      if ("value" in c) return (c.value as string) ?? null;
      return null;
  }
}

function toHttpsTursoUrl(url: string): string {
  // libsql://xxx.turso.io → https://xxx.turso.io (HTTP pipeline)
  return url
    .trim()
    .replace(/^libsql:\/\//i, "https://")
    .replace(/\/$/, "");
}

function createHttpClient(url: string, authToken: string): TursoClient {
  const endpoint = `${toHttpsTursoUrl(url)}/v2/pipeline`;

  async function pipeline(
    requests: Array<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown>>> {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Turso HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
    const body = (await res.json()) as {
      results?: Array<Record<string, unknown>>;
    };
    return body.results || [];
  }

  function parseExecuteResult(result: Record<string, unknown>): ResultSet {
    const response = result.response as
      | { type?: string; result?: Record<string, unknown> }
      | undefined;
    const exec = response?.result || {};
    const cols = (exec.cols as Array<{ name?: string }> | undefined) || [];
    const columns = cols.map((c, i) => c.name || `col${i}`);
    const rawRows = (exec.rows as unknown[][] | undefined) || [];
    const rows = rawRows.map((row) => {
      const obj: Record<string, SqlValue> = {};
      for (let i = 0; i < columns.length; i++) {
        obj[columns[i]!] = fromHranaValue(row[i]);
      }
      return obj;
    });
    return {
      columns,
      rows,
      rowsAffected: Number(exec.affected_row_count || 0),
    };
  }

  return {
    async execute(stmtOrSql, args) {
      const stmt =
        typeof stmtOrSql === "string"
          ? { sql: stmtOrSql, args: args || [] }
          : { sql: stmtOrSql.sql, args: stmtOrSql.args || [] };
      const results = await pipeline([
        {
          type: "execute",
          stmt: {
            sql: stmt.sql,
            args: (stmt.args || []).map(toHranaArg),
          },
        },
        { type: "close" },
      ]);
      const first = results[0];
      if (!first || first.type === "error") {
        const err = first?.error as { message?: string } | undefined;
        throw new Error(err?.message || "Turso execute failed");
      }
      return parseExecuteResult(first);
    },

    async executeMultiple(sql) {
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      if (statements.length === 0) return;
      const requests: Array<Record<string, unknown>> = statements.map((s) => ({
        type: "execute",
        stmt: { sql: s },
      }));
      requests.push({ type: "close" });
      const results = await pipeline(requests);
      for (const r of results) {
        if (r.type === "error") {
          const err = r.error as { message?: string } | undefined;
          throw new Error(err?.message || "Turso executeMultiple failed");
        }
      }
    },
  };
}

export function getTurso(): TursoClient {
  if (!isDbConfigured()) {
    throw new Error(
      "Turso not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (no credit card — turso.tech).",
    );
  }
  if (!client) {
    client = createHttpClient(
      process.env.TURSO_DATABASE_URL!.trim(),
      process.env.TURSO_AUTH_TOKEN!.trim(),
    );
  }
  return client;
}

export async function ensureSchema(): Promise<TursoClient> {
  const db = getTurso();
  if (schemaReady) return db;
  await db.executeMultiple(SCHEMA);
  schemaReady = true;
  return db;
}
