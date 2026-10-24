import { getDb } from '../_db.js';
import { ensureSchema } from '../_init.js';
import { parseBody } from '../_body.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  await ensureSchema();
  const db = getDb();

  // GET — single draft (full data) when ?id= provided, otherwise list summaries
  if (req.method === 'GET') {
    const id = req.query?.id || new URL(req.url, 'http://localhost').searchParams.get('id');
    if (id) {
      const result = await db.execute({ sql: 'SELECT id, data, saved_at FROM drafts WHERE id = ?', args: [id] });
      if (!result.rows.length) return res.status(404).json({ error: 'Draft not found' });
      const row = result.rows[0];
      return res.status(200).json({ id: row.id, savedAt: row.saved_at, ...JSON.parse(row.data) });
    }
    const result = await db.execute(
      'SELECT id, data, saved_at FROM drafts ORDER BY saved_at DESC'
    );
    const drafts = result.rows.map(row => {
      const parsed = JSON.parse(row.data);
      return {
        id: row.id,
        savedAt: row.saved_at,
        invoiceNumber: parsed.invoiceNumber || '',
        customerName: parsed.customerName || '',
        subject: parsed.subject || '',
        currency: parsed.currency || 'INR',
      };
    });
    return res.status(200).json(drafts);
  }

  // POST — upsert draft snapshot (update in-place if same invoiceNumber, else insert)
  if (req.method === 'POST') {
    const data = await parseBody(req);
    const now = new Date().toISOString();
    const invoiceNumber = data.invoiceNumber || '';

    // If there's a non-empty invoice number, check for an existing draft with that number
    if (invoiceNumber) {
      const existing = await db.execute({
        sql: 'SELECT id FROM drafts WHERE json_extract(data, \'$.invoiceNumber\') = ? LIMIT 1',
        args: [invoiceNumber],
      });
      if (existing.rows.length) {
        const existingId = existing.rows[0].id;
        await db.execute({
          sql: 'UPDATE drafts SET data = ?, saved_at = ? WHERE id = ?',
          args: [JSON.stringify(data), now, existingId],
        });
        return res.status(200).json({ id: existingId, savedAt: now });
      }
    }

    // No existing draft for this invoice number — insert new
    const id = randomUUID();
    await db.execute({
      sql: 'INSERT INTO drafts (id, data, saved_at) VALUES (?, ?, ?)',
      args: [id, JSON.stringify(data), now],
    });
    // Keep only the latest 20 drafts — prune older ones
    await db.execute(
      'DELETE FROM drafts WHERE id NOT IN (SELECT id FROM drafts ORDER BY saved_at DESC LIMIT 20)'
    );
    return res.status(201).json({ id, savedAt: now });
  }

  // DELETE — remove a specific draft
  if (req.method === 'DELETE') {
    const id = req.query?.id || req.url?.split('?id=')[1];
    if (!id) return res.status(400).json({ error: 'Missing id' });
    await db.execute({ sql: 'DELETE FROM drafts WHERE id = ?', args: [id] });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}
