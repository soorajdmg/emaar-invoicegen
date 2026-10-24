import { getDb } from '../_db.js';
import { ensureSchema } from '../_init.js';
import { parseBody } from '../_body.js';

export default async function handler(req, res) {
  await ensureSchema();
  const db = getDb();

  if (req.method === 'GET') {
    const result = await db.execute('SELECT data, updated_at FROM draft WHERE id = 1');
    if (result.rows.length === 0) {
      return res.status(200).json({ empty: true });
    }
    const row = result.rows[0];
    return res.status(200).json({
      ...JSON.parse(row.data),
      _updatedAt: row.updated_at,
    });
  }

  if (req.method === 'PUT') {
    const data = await parseBody(req);
    const now = new Date().toISOString();
    await db.execute({
      sql: 'INSERT OR REPLACE INTO draft (id, data, updated_at) VALUES (1, ?, ?)',
      args: [JSON.stringify(data), now],
    });
    return res.status(200).json({ ok: true, updatedAt: now });
  }

  if (req.method === 'DELETE') {
    await db.execute('DELETE FROM draft WHERE id = 1');
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}
