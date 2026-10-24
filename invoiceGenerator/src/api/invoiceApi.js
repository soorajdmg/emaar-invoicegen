const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Invoice list (summary rows)
export function getInvoices(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString();
  return request(`/invoices${qs ? `?${qs}` : ''}`);
}

// Single full invoice (for loading into form)
export function getInvoice(id) {
  return request(`/invoices/${id}`);
}

// Save new invoice
export function saveInvoice(data) {
  return request('/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Update existing saved invoice
export function updateInvoice(id, data) {
  return request(`/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Delete invoice from history
export function deleteInvoice(id) {
  return request(`/invoices/${id}`, { method: 'DELETE' });
}

// Load current draft
export function getDraft() {
  return request('/draft');
}

// Upsert draft (auto-save)
export function saveDraft(data) {
  return request('/draft', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Clear draft
export function clearDraft() {
  return request('/draft', { method: 'DELETE' });
}

// List all auto-saved draft snapshots
export function getDrafts() {
  return request('/drafts');
}

// Get full data for a single draft snapshot
export function getDraftById(id) {
  return request(`/drafts?id=${encodeURIComponent(id)}`);
}

// Save a new draft snapshot
export function saveDraftSnapshot(data) {
  return request('/drafts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Delete a specific draft snapshot
export function deleteDraftSnapshot(id) {
  return request(`/drafts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}
