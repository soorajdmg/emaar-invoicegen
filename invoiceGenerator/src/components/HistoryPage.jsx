import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvoices, deleteInvoice, getDrafts, deleteDraftSnapshot } from '../api/invoiceApi';
import Navbar from './navbar';
import './HistoryPage.css';

const LoadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v6M14 11v6"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
  </svg>
);
const EmptyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>
    <path d="M14 3v5h5M9 13h6M9 17h4"/>
  </svg>
);
const AlertIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const ConfirmModal = ({ message, subtext, onConfirm, onCancel }) => (
  <div className="confirm-overlay" onClick={onCancel}>
    <div className="confirm-modal" onClick={e => e.stopPropagation()}>
      <div className="confirm-icon"><AlertIcon /></div>
      <p className="confirm-message">{message}</p>
      {subtext && <p className="confirm-subtext">{subtext}</p>}
      <div className="confirm-actions">
        <button className="confirm-btn confirm-cancel" onClick={onCancel}>Cancel</button>
        <button className="confirm-btn confirm-delete" onClick={onConfirm}>Delete</button>
      </div>
    </div>
  </div>
);

const fmt = (n, currency) =>
  n.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d) ? iso : d.toLocaleDateString('en-GB');
};

const formatDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const MarqueeCell = ({ text, className, cellClassName, dataLabel }) => {
  const textRef = useRef(null);
  const cellRef = useRef(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    if (textRef.current && cellRef.current) {
      setOverflows(textRef.current.scrollWidth > cellRef.current.clientWidth);
    }
  }, [text]);

  return (
    <td ref={cellRef} className={cellClassName} data-label={dataLabel}>
      <div className={`marquee-wrap${overflows ? ' marquee-active' : ''}`}>
        <span ref={textRef} className={className}>{text || '—'}</span>
        {overflows && <span className={`marquee-copy ${className}`} aria-hidden="true">{text || '—'}</span>}
      </div>
    </td>
  );
};

const HistoryPage = () => {
  const navigate = useNavigate();

  // Tab state
  const [tab, setTab] = useState('invoices'); // 'invoices' | 'drafts'

  // Invoices state
  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');
  const [currency, setCurrency]   = useState('');
  const [sort, setSort]           = useState('newest');
  const [deleting, setDeleting]   = useState(null);

  // Drafts state
  const [drafts, setDrafts]           = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError]   = useState(null);
  const [deletingDraft, setDeletingDraft] = useState(null);

  // Confirm modal: null | { message, subtext, onConfirm }
  const [confirmState, setConfirmState] = useState(null);
  const closeConfirm = () => setConfirmState(null);

  const fetchInvoices = () => {
    setLoading(true);
    setError(null);
    getInvoices({ currency: currency || undefined })
      .then(data => { setInvoices(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  const fetchDrafts = () => {
    setDraftsLoading(true);
    setDraftsError(null);
    getDrafts()
      .then(data => { setDrafts(data); setDraftsLoading(false); })
      .catch(err => { setDraftsError(err.message); setDraftsLoading(false); });
  };

  useEffect(() => {
    fetchInvoices();
  }, [currency]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === 'drafts') fetchDrafts();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoad = (id) => {
    navigate('/', { state: { loadInvoiceId: id } });
  };

  const handleLoadDraft = (draft) => {
    navigate('/', { state: { loadDraft: draft } });
  };

  const handleDelete = (id, invoiceNumber) => {
    setConfirmState({
      message: 'Delete this invoice?',
      subtext: invoiceNumber ? `Invoice ${invoiceNumber} will be permanently removed.` : 'This cannot be undone.',
      onConfirm: async () => {
        closeConfirm();
        setDeleting(id);
        try {
          await deleteInvoice(id);
          setInvoices(prev => prev.filter(inv => inv.id !== id));
        } catch (err) {
          alert('Delete failed: ' + err.message);
        } finally {
          setDeleting(null);
        }
      },
    });
  };

  const handleDeleteDraft = (id, invoiceNumber) => {
    setConfirmState({
      message: 'Delete this draft?',
      subtext: invoiceNumber ? `Draft for invoice ${invoiceNumber} will be permanently removed.` : 'This cannot be undone.',
      onConfirm: async () => {
        closeConfirm();
        setDeletingDraft(id);
        try {
          await deleteDraftSnapshot(id);
          setDrafts(prev => prev.filter(d => d.id !== id));
        } catch (err) {
          alert('Delete failed: ' + err.message);
        } finally {
          setDeletingDraft(null);
        }
      },
    });
  };

  // Client-side filter + sort
  const q = search.toLowerCase();
  const filtered = (q
    ? invoices.filter(
        inv =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          (inv.subject || '').toLowerCase().includes(q)
      )
    : invoices
  ).slice().sort((a, b) => {
    switch (sort) {
      case 'oldest':    return new Date(a.date) - new Date(b.date);
      case 'total-asc': return (a.total || 0) - (b.total || 0);
      case 'total-desc':return (b.total || 0) - (a.total || 0);
      case 'customer':  return (a.customerName || '').localeCompare(b.customerName || '');
      case 'newest':
      default:          return new Date(b.date) - new Date(a.date);
    }
  });

  return (
    <>
      <Navbar minimal onNewInvoice={() => navigate('/')} />
      <div className="history-page">

      {/* Header */}
      <div className="history-header">
        <div className="history-title-block">
          <h1 className="history-title">Invoice history</h1>
          {tab === 'invoices' && !loading && !error && (
            <span className="history-count">{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</span>
          )}
          {tab === 'drafts' && !draftsLoading && !draftsError && (
            <span className="history-count">{drafts.length} draft{drafts.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="history-tabs">
        <button
          className={`history-tab${tab === 'invoices' ? ' active' : ''}`}
          onClick={() => setTab('invoices')}
        >
          Invoices
        </button>
        <button
          className={`history-tab${tab === 'drafts' ? ' active' : ''}`}
          onClick={() => setTab('drafts')}
        >
          Drafts
        </button>
      </div>

      {/* ── Invoices tab ── */}
      {tab === 'invoices' && (
        <>
          {/* Filters */}
          <div className="history-filters">
            <div className="history-search-wrap">
              <SearchIcon />
              <input
                className="history-search"
                type="text"
                placeholder="Search by number, customer or subject…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="history-filter-row">
              <div className="currency-pill">
                <div className={`currency-thumb${currency === 'AED' ? ' aed' : ''}${currency === '' ? ' all' : ''}`} />
                <button className={`currency-option${currency === '' ? ' active' : ''}`} onClick={() => setCurrency('')}>All</button>
                <button className={`currency-option${currency === 'INR' ? ' active' : ''}`} onClick={() => setCurrency('INR')}>INR</button>
                <button className={`currency-option${currency === 'AED' ? ' active' : ''}`} onClick={() => setCurrency('AED')}>AED</button>
              </div>

              <div className="history-sort-wrap">
                <label className="history-sort-label">Sort</label>
                <select className="history-sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="newest">Date - newest</option>
                  <option value="oldest">Date - oldest</option>
                  <option value="total-desc">Amount - high to low</option>
                  <option value="total-asc">Amount - low to high</option>
                  <option value="customer">Customer A-Z</option>
                </select>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="history-content">
            {loading && (
              <div className="history-loading">
                {[1,2,3].map(i => (
                  <div key={i} className="history-skeleton-row">
                    <div className="skeleton skeleton-num" />
                    <div className="skeleton skeleton-name" />
                    <div className="skeleton skeleton-subj" />
                    <div className="skeleton skeleton-amt" />
                  </div>
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="history-error">
                <p>Could not load invoices</p>
                <p className="history-error-detail">{error}</p>
                <button className="history-retry-btn" onClick={fetchInvoices}>Try again</button>
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="history-empty">
                <EmptyIcon />
                <p className="history-empty-title">
                  {invoices.length === 0 ? 'No saved invoices yet' : 'No invoices match your filters'}
                </p>
                <p className="history-empty-sub">
                  {invoices.length === 0
                    ? 'Fill in the form and click Save to store an invoice here.'
                    : 'Try adjusting the search or filters.'}
                </p>
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th className="hide-mobile">Subject</th>
                      <th>Currency</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(inv => (
                      <tr key={inv.id} className="history-row">
                        <td className="history-inv-num" data-label="Invoice #">{inv.invoiceNumber || '—'}</td>
                        <td className="history-date" data-label="Date">{formatDate(inv.date)}</td>
                        <MarqueeCell text={inv.customerName} className="marquee-text marquee-text--bold" cellClassName="marquee-cell" dataLabel="Customer" />
                        <MarqueeCell text={inv.subject} className="marquee-text marquee-text--muted" cellClassName="marquee-cell hide-mobile" dataLabel="Subject" />
                        <td data-label="Currency">
                          <span className={`history-currency-badge history-currency-${inv.currency?.toLowerCase()}`}>
                            {inv.currency}
                          </span>
                        </td>
                        <td className="history-total" data-label="Total">
                          <span className="history-total-sym">{inv.currency === 'INR' ? '₹' : 'AED'}</span>
                          {fmt(inv.total || 0, inv.currency)}
                        </td>
                        <td className="history-actions" data-label="">
                          <button
                            className="history-action-btn history-load-btn"
                            onClick={() => handleLoad(inv.id)}
                            title="Load into form"
                          >
                            <LoadIcon />
                            <span>Load</span>
                          </button>
                          <button
                            className="history-action-btn history-delete-btn"
                            onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
                            disabled={deleting === inv.id}
                            title="Delete invoice"
                          >
                            <TrashIcon />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Drafts tab ── */}
      {tab === 'drafts' && (
        <div className="history-content">
          {draftsLoading && (
            <div className="history-loading">
              {[1,2,3].map(i => (
                <div key={i} className="history-skeleton-row">
                  <div className="skeleton skeleton-num" />
                  <div className="skeleton skeleton-name" />
                  <div className="skeleton skeleton-subj" />
                  <div className="skeleton skeleton-amt" />
                </div>
              ))}
            </div>
          )}

          {!draftsLoading && draftsError && (
            <div className="history-error">
              <p>Could not load drafts</p>
              <p className="history-error-detail">{draftsError}</p>
              <button className="history-retry-btn" onClick={fetchDrafts}>Try again</button>
            </div>
          )}

          {!draftsLoading && !draftsError && drafts.length === 0 && (
            <div className="history-empty">
              <EmptyIcon />
              <p className="history-empty-title">No drafts yet</p>
              <p className="history-empty-sub">
                Drafts are saved automatically every 2 minutes while you work on an invoice.
              </p>
            </div>
          )}

          {!draftsLoading && !draftsError && drafts.length > 0 && (
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Auto-saved</th>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th className="hide-mobile">Subject</th>
                    <th>Currency</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map(d => (
                    <tr key={d.id} className="history-row">
                      <td className="history-date draft-saved-at" data-label="Auto-saved">{formatDateTime(d.savedAt)}</td>
                      <td className="history-inv-num" data-label="Invoice #">{d.invoiceNumber || '—'}</td>
                      <MarqueeCell text={d.customerName} className="marquee-text marquee-text--bold" cellClassName="marquee-cell" dataLabel="Customer" />
                      <MarqueeCell text={d.subject} className="marquee-text marquee-text--muted" cellClassName="marquee-cell hide-mobile" dataLabel="Subject" />
                      <td data-label="Currency">
                        <span className={`history-currency-badge history-currency-${d.currency?.toLowerCase()}`}>
                          {d.currency}
                        </span>
                      </td>
                      <td className="history-actions" data-label="">
                        <button
                          className="history-action-btn history-load-btn"
                          onClick={() => handleLoadDraft(d)}
                          title="Restore this draft"
                        >
                          <LoadIcon />
                          <span>Restore</span>
                        </button>
                        <button
                          className="history-action-btn history-delete-btn"
                          onClick={() => handleDeleteDraft(d.id, d.invoiceNumber)}
                          disabled={deletingDraft === d.id}
                          title="Delete draft"
                        >
                          <TrashIcon />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>

      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          subtext={confirmState.subtext}
          onConfirm={confirmState.onConfirm}
          onCancel={closeConfirm}
        />
      )}
    </>
  );
};

export default HistoryPage;
