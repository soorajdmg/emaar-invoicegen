import { getDb } from '../_db.js';
import { ensureSchema } from '../_init.js';
import { parseBody } from '../_body.js';

function computeTotal(itemsJson) {
  try {
    const items = JSON.parse(itemsJson);
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  } catch {
    return 0;
  }
}

export default async function handler(req, res) {
  await ensureSchema();
  const db = getDb();

  if (req.method === 'GET') {
    const { search, currency, from, to } = req.query || {};

    let sql = `
      SELECT id, invoice_number, date, customer_name, subject, currency, items, created_at
      FROM invoices
      WHERE 1=1
    `;
    const args = [];

    if (currency && (currency === 'INR' || currency === 'AED')) {
      sql += ' AND currency = ?';
      args.push(currency);
    }
    if (from) {
      sql += ' AND date >= ?';
      args.push(from);
    }
    if (to) {
      sql += ' AND date <= ?';
      args.push(to);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await db.execute({ sql, args });

    let rows = result.rows.map(row => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      date: row.date,
      customerName: row.customer_name,
      subject: row.subject,
      currency: row.currency,
      total: computeTotal(row.items),
      createdAt: row.created_at,
    }));

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        r =>
          r.invoiceNumber.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          (r.subject || '').toLowerCase().includes(q)
      );
    }

    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const body = await parseBody(req);
    const { invoiceNumber, date, customerName, address, subject, notes, currency, items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (currency !== 'INR' && currency !== 'AED') {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO invoices
              (id, invoice_number, date, customer_name, address, subject, notes, currency, items, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        invoiceNumber || '',
        date || '',
        customerName || '',
        address || '',
        subject || '',
        notes || '',
        currency,
        JSON.stringify(items),
        now,
        now,
      ],
    });

    return res.status(201).json({
      id,
      invoiceNumber,
      date,
      customerName,
      address,
      subject,
      notes,
      currency,
      items,
      createdAt: now,
      updatedAt: now,
    });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
