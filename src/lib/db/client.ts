import { createClient, type Client } from "@libsql/client";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS docs (
  col TEXT NOT NULL,
  id TEXT NOT NULL,
  json TEXT NOT NULL,
  PRIMARY KEY (col, id)
);
CREATE INDEX IF NOT EXISTS idx_docs_col ON docs(col);
`;

let client: Client | undefined;
let schemaReady = false;

export function isDbConfigured(): boolean {
  return Boolean(
    process.env.TURSO_DATABASE_URL?.trim() &&
      process.env.TURSO_AUTH_TOKEN?.trim(),
  );
}

export function getTurso(): Client {
  if (!isDbConfigured()) {
    throw new Error(
      "Turso not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (no credit card — turso.tech).",
    );
  }
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL!.trim(),
      authToken: process.env.TURSO_AUTH_TOKEN!.trim(),
    });
  }
  return client;
}

export async function ensureSchema(): Promise<Client> {
  const db = getTurso();
  if (schemaReady) return db;
  await db.executeMultiple(SCHEMA);
  schemaReady = true;
  return db;
}
