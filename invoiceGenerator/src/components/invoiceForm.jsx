import React, { useState, useEffect, useRef } from 'react';
import GenerateInvoiceButton from './generateInvoice';
import Navbar from './navbar';
import './invoiceForm.css';

const MAX_ITEMS = 5;

const initialFormState = {
  invoiceNumber: '',
  date: '',
  customerName: '',
  address: '',
  subject: '',
  notes: '',
  items: [{ id: 1, description: '', quantity: 1, price: 0 }],
  currency: 'INR',
};

let uid = 1;

const fmt = (n, currency) =>
  n.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* ── number → words ──────────────────────────────────── */
const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
const w2 = n => n < 20 ? ONES[n] : TENS[Math.floor(n/10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
const w3 = n => (n >= 100 ? ONES[Math.floor(n/100)] + ' Hundred' + (n % 100 ? ' ' : '') : '') + (n % 100 ? w2(n % 100) : '');
const toWords = (n, indian) => {
  n = Math.floor(n); if (!n) return 'Zero';
  const parts = [];
  const scales = indian
    ? [[1e7,'Crore'],[1e5,'Lakh'],[1e3,'Thousand']]
    : [[1e9,'Billion'],[1e6,'Million'],[1e3,'Thousand']];
  for (const [v, name] of scales) {
    if (n >= v) { parts.push(w3(Math.floor(n / v)) + ' ' + name); n %= v; }
  }
  if (n) parts.push(w3(n));
  return parts.join(' ');
};
const inWords = (t, c) => {
  const whole = Math.floor(t + 1e-9);
  const frac  = Math.round((t - whole) * 100);
  const sub   = frac ? ' and ' + w2(frac) + (c === 'INR' ? ' Paise' : ' Fils') : '';
  return (c === 'INR' ? 'Rs. ' : 'AED ') + toWords(whole, c === 'INR') + sub + ' only';
};

/* ── Icons ───────────────────────────────────────────── */
const AddLineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>
    <path d="M14 3v5h5M12 11v6M9 14h6"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v6M14 11v6"/>
  </svg>
);
const EditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="billed-edit-icon">
    <path d="M4 20h4L19 9l-4-4L4 16z"/>
    <path d="M13.5 6.5l4 4"/>
  </svg>
);
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 5l-7 7 7 7"/>
  </svg>
);
const PdfIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>
    <path d="M14 3v5h5M9 13h6M9 17h4"/>
  </svg>
);

/* ── Preview aside ───────────────────────────────────── */
const InvoicePreview = ({ data, onClose, showBack }) => {
  const sym = data.currency === 'INR' ? '₹' : 'AED';
  const total = data.items.reduce(
    (s, it) => s + (Number(it.quantity)||0) * (Number(it.price)||0), 0
  );

  const d = data.date ? new Date(data.date + 'T00:00:00') : null;
  const dateOut = d && !isNaN(d) ? d.toLocaleDateString('en-GB') : '';

  const toBlock = [data.customerName, data.address].filter(Boolean).join('\n');

  // PDF coordinates match POSITIONS in generateInvoice.jsx (595×842 pt canvas)
  // We render at natural aspect ratio using container queries (cqw units)
  const rows = data.items.slice(0, 5).map((it, i) => ({
    sl:    String(i + 1),
    desc:  it.description || '',
    qty:   it.quantity || '',
    price: (Number(it.price)||0).toFixed(2),
    total: ((Number(it.quantity)||0) * (Number(it.price)||0)).toFixed(2),
    // top% = (startY + rowSpacing * i) / 841.92 * 100
    top:   ((498 + 15 * i - 7.2) / 841.92 * 100).toFixed(4) + '%',
  }));

  return (
    <aside className="preview-aside">
      <div className="preview-head">
        <div className="preview-head-left">
          {showBack && (
            <button className="preview-back-btn" onClick={onClose} title="Back to editing">
              <BackIcon />
            </button>
          )}
          <h2 className="card-title">Preview</h2>
          <span className="preview-live-dot">
            <span className="live-dot" />
            Live
          </span>
        </div>
        <span className="preview-pdf-badge">
          <PdfIcon /> PDF · A4
        </span>
      </div>

      {/* A4 letterhead canvas */}
      <div className="preview-canvas">
        {/* invoice number */}
        <span className="pv-text" style={{ left:'12.93%', top:'30.76%' }}>
          {data.invoiceNumber}
        </span>
        {/* date */}
        <span className="pv-text" style={{ left:'15.11%', top:'32.31%' }}>
          {dateOut}
        </span>
        {/* billed to */}
        <div className="pv-text pv-multiline" style={{ left:'9.07%', top:'40.62%', width:'60%' }}>
          {toBlock}
        </div>
        {/* subject */}
        <span className="pv-text pv-ellipsis" style={{ left:'17.63%', top:'52.86%', maxWidth:'75%' }}>
          {data.subject}
        </span>
        {/* rows */}
        {rows.map((r) => (
          <div key={r.sl} className="pv-row" style={{ top: r.top }}>
            <span style={{ position:'absolute', left:'9.74%' }}>{r.sl}</span>
            <span style={{ position:'absolute', left:'15.11%', maxWidth:'42%', overflow:'hidden', textOverflow:'ellipsis' }}>{r.desc}</span>
            <span style={{ position:'absolute', left:'58.78%' }}>{r.qty}</span>
            <span style={{ position:'absolute', left:'69.7%' }}>{r.price}</span>
            <span style={{ position:'absolute', left:'81.12%' }}>{r.total}</span>
          </div>
        ))}
        {/* total amount */}
        <span className="pv-text pv-total" style={{ left:'80.95%', top:'68.68%' }}>
          {total.toFixed(2)}
        </span>
        {/* amount in words */}
        <span className="pv-text pv-words" style={{ right:'9.3%', top:'71.24%', maxWidth:'84%', textAlign:'right' }}>
          {inWords(total, data.currency)}
        </span>
        {/* notes */}
        <div className="pv-text pv-notes" style={{ left:'9.07%', top:'74.92%', width:'82%' }}>
          {data.notes}
        </div>
      </div>
    </aside>
  );
};

/* ════════════════════════════════════════════════════════
   Main form component
════════════════════════════════════════════════════════ */
const InvoiceForm = () => {
  const [data, setData]         = useState(initialFormState);
  const [genState, setGenState] = useState('idle');
  const [toast, setToast]       = useState(null);
  const [undoSnap, setUndoSnap] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [viewportW, setViewportW]     = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ≥1100px: always show both panels side by side
  const isWide         = viewportW >= 1100;
  const showPreviewBtn = !isWide;
  const formVisible    = isWide || !previewOpen;
  const asideVisible   = isWide || previewOpen;

  window.resetInvoiceForm = () => setData(initialFormState);

  const patch     = (obj)       => setData((d) => ({ ...d, ...obj }));
  const patchItem = (id, chg)   => setData((d) => ({ ...d, items: d.items.map(it => it.id === id ? { ...it, ...chg } : it) }));

  const activeItems = data.items;
  const liveCount   = activeItems.length;

  const addItem = () => {
    if (liveCount >= MAX_ITEMS) return;
    const id = ++uid;
    setData(d => ({ ...d, items: [...d.items, { id, description:'', quantity:1, price:0 }] }));
  };
  const removeItem = (id) => {
    if (liveCount <= 1) return;
    setData(d => ({ ...d, items: d.items.filter(it => it.id !== id) }));
  };

  const total    = activeItems.reduce((s,it) => s + (Number(it.quantity)||0)*(Number(it.price)||0), 0);
  const sym      = data.currency === 'INR' ? '₹' : 'AED';
  const totalText = `${sym} ${fmt(total, data.currency)}`;

  /* generate */
  const handleGenerate = async () => {
    if (genState !== 'idle') return;
    setGenState('loading');
    if (window._generatePDF) {
      try { await window._generatePDF(data); } catch(e) { console.error(e); }
    }
    setGenState('done');
    showToast(`${data.invoiceNumber || 'invoice'}.pdf downloaded`);
    setTimeout(() => setGenState('idle'), 2600);
  };

  /* new invoice */
  const handleNewInvoice = () => {
    const snap = { ...data };
    const m = /(\d+)(?!.*\d)/.exec(data.invoiceNumber || '');
    const nextNum = m
      ? data.invoiceNumber.slice(0,m.index) + String(+m[1]+1).padStart(m[1].length,'0') + data.invoiceNumber.slice(m.index+m[1].length)
      : '';
    setUndoSnap(snap);
    setData({ ...initialFormState, invoiceNumber: nextNum, date: new Date().toISOString().slice(0,10) });
    showToast('Started a new invoice', true);
  };

  /* toast */
  const showToast = (text, canUndo=false) => {
    setToast({ text, canUndo });
    setTimeout(() => { setToast(null); setUndoSnap(null); }, canUndo ? 5000 : 2600);
  };
  const handleUndo = () => { if (undoSnap) { setData(undoSnap); setUndoSnap(null); setToast(null); } };

  /* toggle preview (mobile) */
  const togglePreview = () => { setPreviewOpen(p => !p); window.scrollTo(0,0); };

  return (
    <>
      <Navbar
        invoiceData={data}
        onGenerate={handleGenerate}
        onNewInvoice={handleNewInvoice}
        genState={genState}
        totalText={totalText}
        showPreviewBtn={showPreviewBtn}
        previewOpen={previewOpen}
        onTogglePreview={togglePreview}
      />

      <div className="invoice-layout">

        {/* ── Form column ───────────────────────── */}
        {formVisible && (
          <main className="invoice-page">

            {/* Invoice detail */}
            <section className="card">
              <div className="card-head">
                <h2 className="card-title">Invoice detail</h2>
                <div className="currency-pill">
                  <div className={`currency-thumb${data.currency === 'AED' ? ' aed' : ''}`} />
                  <button className={`currency-option${data.currency === 'INR' ? ' active' : ''}`} onClick={() => patch({ currency:'INR' })}>₹ INR</button>
                  <button className={`currency-option${data.currency === 'AED' ? ' active' : ''}`} onClick={() => patch({ currency:'AED' })}>د.إ AED</button>
                </div>
              </div>
              <div className="card-body">
                <div className="detail-grid">
                  <label className="field">
                    <span className="field-label">Invoice number</span>
                    <input className="field-input field-input-mono" placeholder="INV-001" value={data.invoiceNumber} onChange={e => patch({ invoiceNumber: e.target.value })} />
                  </label>
                  <label className="field">
                    <span className="field-label">Date</span>
                    <input type="date" className="field-input" value={data.date} onChange={e => patch({ date: e.target.value })} />
                  </label>
                  <div className="field field-full">
                    <span className="field-label">Billed to</span>
                    <div className="billed-card">
                      <div className="billed-fields">
                        <input className="billed-name-input" placeholder="Customer name" value={data.customerName} onChange={e => patch({ customerName: e.target.value })} />
                        <textarea className="billed-address-input" rows={3} placeholder="Street, city, postcode, country" value={data.address} onChange={e => patch({ address: e.target.value })} />
                      </div>
                      <EditIcon />
                    </div>
                  </div>
                  <label className="field field-full">
                    <span className="field-label">Subject</span>
                    <input className="field-input" placeholder="What is this invoice for?" value={data.subject} onChange={e => patch({ subject: e.target.value })} />
                  </label>
                </div>
              </div>
            </section>

            {/* Line items */}
            <section className="card">
              <div className="card-head">
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <h2 className="card-title">Line items</h2>
                  <span className="item-count-badge">{liveCount}</span>
                </div>
                <span className="enter-hint hide-mobile">
                  <span className="kbd">↵ Enter</span>adds a row
                </span>
              </div>
              <div className="card-body">
                <div className="items-inner">
                  <div className="items-col-header hide-mobile">
                    <span>#</span><span>Description</span>
                    <span style={{ textAlign:'right' }}>Qty</span>
                    <span style={{ textAlign:'right' }}>Price</span>
                    <span style={{ textAlign:'right' }}>Total</span>
                    <span />
                  </div>
                  {activeItems.map((item, i) => (
                    <div key={item.id} className="item-row">
                      <span className="item-idx">{String(i+1).padStart(2,'0')}</span>
                      <input className="item-input" placeholder="Item or service" value={item.description}
                        onChange={e => patchItem(item.id, { description: e.target.value })}
                        onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); addItem(); } }} />
                      <input className="item-input item-input-num" inputMode="decimal" placeholder="0" value={item.quantity}
                        onChange={e => patchItem(item.id, { quantity: e.target.value })}
                        onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); addItem(); } }} />
                      <input className="item-input item-input-num" inputMode="decimal" placeholder="0.00" value={item.price}
                        onChange={e => patchItem(item.id, { price: e.target.value })}
                        onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); addItem(); } }} />
                      <span className="item-total">
                        {fmt((Number(item.quantity)||0)*(Number(item.price)||0), data.currency)}
                      </span>
                      <button className="item-delete-btn" onClick={() => removeItem(item.id)} title="Remove row"
                        disabled={liveCount<=1} style={{ opacity: liveCount<=1 ? 0 : 1 }}>
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                  <div className="items-footer">
                    <button className="add-item-btn" onClick={addItem} disabled={liveCount >= MAX_ITEMS}>
                      <AddLineIcon />Add new line
                    </button>
                    <span className="rows-used">
                      {liveCount >= MAX_ITEMS ? 'Max 5 rows · paper limit' : `${liveCount} / 5 rows`}
                    </span>
                  </div>
                </div>
                <div className="total-strip">
                  <div className="total-block">
                    <span className="total-label">Total due ({data.currency})</span>
                    <div className="total-value">
                      <span className="total-sym">{sym}</span>
                      <span className="total-num">{fmt(total, data.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Notes */}
            <section className="card">
              <div className="card-head">
                <h2 className="card-title">Notes &amp; payment terms</h2>
              </div>
              <div className="card-body">
                <textarea className="notes-textarea" rows={4}
                  placeholder="Add payment terms, bank details or a thank-you note"
                  value={data.notes} onChange={e => patch({ notes: e.target.value })} />
              </div>
            </section>

            {/* Hidden PDF trigger */}
            <div style={{ display:'none' }}>
              <GenerateInvoiceButton invoiceData={data} exposeRef={fn => { window._generatePDF = fn; }} />
            </div>
          </main>
        )}

        {/* ── Preview column ────────────────────── */}
        {asideVisible && (
          <InvoicePreview
            data={data}
            onClose={togglePreview}
            showBack={!isWide && previewOpen}
          />
        )}
      </div>

      {/* Toast — fixed center on desktop, fixed above mobile footer on mobile */}
      {toast && (
        <>
          <div className="toast-wrapper-desktop hide-mobile">
            <div className="toast toast-desktop">
              <span>{toast.text}</span>
              {toast.canUndo && <button className="toast-undo-btn" onClick={handleUndo}>Undo</button>}
            </div>
          </div>
          <div className="toast-wrapper-mobile show-mobile">
            <div className="toast toast-mobile">
              <span>{toast.text}</span>
              {toast.canUndo && <button className="toast-undo-btn" onClick={handleUndo}>Undo</button>}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default InvoiceForm;
