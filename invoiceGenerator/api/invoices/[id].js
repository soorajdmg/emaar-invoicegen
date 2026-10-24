import { getDb } from '../_db.js';
import { ensureSchema } from '../_init.js';
import { parseBody } from '../_body.js';

export default async function handler(req, res) {
  await ensureSchema();
  const db = getDb();

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing invoice id' });
  }

  if (req.method === 'GET') {
    const result = await db.execute({
      sql: 'SELECT * FROM invoices WHERE id = ?',
      args: [id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const row = result.rows[0];
    return res.status(200).json({
      id: row.id,
      invoiceNumber: row.invoice_number,
      date: row.date,
      customerName: row.customer_name,
      address: row.address,
      subject: row.subject,
      notes: row.notes,
      currency: row.currency,
      items: JSON.parse(row.items),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  if (req.method === 'PUT') {
    const body = await parseBody(req);
    const { invoiceNumber, date, customerName, address, subject, notes, currency, items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (currency !== 'INR' && currency !== 'AED') {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    const now = new Date().toISOString();

    const result = await db.execute({
      sql: `UPDATE invoices SET
              invoice_number = ?,
              date = ?,
              customer_name = ?,
              address = ?,
              subject = ?,
              notes = ?,
              currency = ?,
              items = ?,
              updated_at = ?
            WHERE id = ?`,
      args: [
        invoiceNumber || '',
        date || '',
        customerName || '',
        address || '',
        subject || '',
        notes || '',
        currency,
        JSON.stringify(items),
        now,
        id,
      ],
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    return res.status(200).json({ ok: true, updatedAt: now });
  }

  if (req.method === 'DELETE') {
    const result = await db.execute({
      sql: 'DELETE FROM invoices WHERE id = ?',
      args: [id],
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}
