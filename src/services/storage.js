import { getActiveUserId } from './session.js';

const API_KEY = import.meta.env.VITE_API_KEY || '';

const NETWORK_ERROR = 'Could not reach the server. Check your connection and try again.';

const parseErrorMessage = async (response) => {
  try {
    const data = await response.json();
    if (data?.error) return data.error;
    if (data?.message) return data.message;
  } catch {
    // ignore
  }
  return `Request failed (${response.status})`;
};

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
    if (!response.ok) {
      const error = await parseErrorMessage(response);
      return { ok: false, data: null, error, status: response.status };
    }
    const data = await response.json();
    return { ok: true, data, error: null, status: response.status };
  } catch (error) {
    console.error(`API request failed: ${url}`, error);
    return { ok: false, data: null, error: NETWORK_ERROR, status: 0 };
  }
};

export const fetchTransactions = async () => {
  const result = await request('/api/transactions');
  if (!result.ok) return { ok: false, data: null, error: result.error };
  return { ok: true, data: Array.isArray(result.data) ? result.data : [], error: null };
};

export const saveTransaction = async (transaction) => {
  const { ok, data, error } = await request('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(transaction),
  });
  return { ok, data, error };
};

export const deleteTransaction = async (id) => {
  if (!id) return { ok: false, error: 'Missing transaction id' };
  const { ok, error } = await request(`/api/transactions/${id}`, { method: 'DELETE' });
  return { ok, error };
};

export const uploadReceipt = async (file, date) => {
  const formData = new FormData();
  formData.append('receipt', file);
  formData.append('date', date);

  const { ok, data, error } = await request('/api/upload', { method: 'POST', body: formData });
  return { ok, receiptUrl: ok ? data.receiptUrl : null, error };
};

export const fetchConfig = async () => {
  const { ok, data, error } = await request('/api/config');
  return { ok, data, error };
};

export const saveConfig = async (config) => {
  const { ok, error } = await request('/api/config', {
    method: 'POST',
    body: JSON.stringify(config),
  });
  return { ok, error };
};
