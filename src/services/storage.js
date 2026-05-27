import { getActiveUserId } from './session.js';

const API_KEY = import.meta.env.VITE_API_KEY || '';

const request = async (url, options = {}) => {
  const headers = {
    'x-api-key': API_KEY,
    'x-budget-user': getActiveUserId(),
    ...options.headers,
  };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) return { ok: false, data: null };
    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    console.error(`API request failed: ${url}`, error);
    return { ok: false, data: null };
  }
};

export const fetchTransactions = async () => {
  const { ok, data } = await request('/api/transactions');
  if (!ok) return null;
  return Array.isArray(data) ? data : [];
};

export const saveTransaction = async (transaction) => {
  const { ok } = await request('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(transaction),
  });
  return ok;
};

export const deleteTransaction = async (id) => {
  if (!id) return false;
  const { ok } = await request(`/api/transactions/${id}`, { method: 'DELETE' });
  return ok;
};

export const uploadReceipt = async (file, date) => {
  const formData = new FormData();
  formData.append('receipt', file);
  formData.append('date', date);

  const { ok, data } = await request('/api/upload', { method: 'POST', body: formData });
  return ok ? data.receiptUrl : null;
};

export const fetchConfig = async () => {
  const { ok, data } = await request('/api/config');
  return ok ? data : null;
};

export const saveConfig = async (config) => {
  const { ok } = await request('/api/config', {
    method: 'POST',
    body: JSON.stringify(config),
  });
  return ok;
};
