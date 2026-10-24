import { getDb } from './_db.js';

export async function ensureSchema() {
  const db = getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id            TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL,
      date          TEXT NOT NULL,
      customer_name TEXT NOT NULL DEFAULT '',
      address       TEXT NOT NULL DEFAULT '',
      subject       TEXT NOT NULL DEFAULT '',
      notes         TEXT NOT NULL DEFAULT '',
      currency      TEXT NOT NULL DEFAULT 'INR',
      items         TEXT NOT NULL,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS draft (
      id         INTEGER PRIMARY KEY CHECK (id = 1),
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS drafts (
      id         TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      saved_at   TEXT NOT NULL
    )
  `);
}
