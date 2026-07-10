import { getActiveUserId } from './session.js';

const REQUEST_TIMEOUT_MS = 15_000;

const NETWORK_ERROR = 'Could not reach the server. Check your connection and try again.';
const TIMEOUT_ERROR = 'Request timed out. Check your connection and try again.';

const parseErrorMessage = async (response) => {
  try {
    const data = await response.json();
    if (data?.error) return { error: data.error, code: data.code ?? null };
    if (data?.message) return { error: data.message, code: data.code ?? null };
  } catch {
    // ignore
  }
  return { error: `Request failed (${response.status})`, code: null };
};

const request = async (url, options = {}) => {
  const headers = {
    'x-api-key': import.meta.env.VITE_API_KEY || '',
    'x-budget-user': getActiveUserId(),
    ...options.headers,
  };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      const { error, code } = await parseErrorMessage(response);
      return { ok: false, data: null, error, code, status: response.status };
    }
    const data = await response.json();
    return { ok: true, data, error: null, code: null, status: response.status };
  } catch (error) {
    const isTimeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    console.error(`API request failed: ${url}`, error);
    return {
      ok: false,
      data: null,
      error: isTimeout ? TIMEOUT_ERROR : NETWORK_ERROR,
      code: isTimeout ? 'TIMEOUT' : 'NETWORK',
      status: 0,
    };
  }
};

export const fetchTransactions = async () => {
  const result = await request('/api/transactions');
  if (!result.ok) return { ok: false, data: null, error: result.error, status: result.status, code: result.code };
  return {
    ok: true,
    data: Array.isArray(result.data) ? result.data : [],
    error: null,
    status: result.status,
    code: null,
  };
};

export const saveTransaction = async (transaction) => {
  const result = await request('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(transaction),
  });
  return {
    ok: result.ok,
    data: result.data,
    error: result.error,
    status: result.status,
    code: result.code,
  };
};

export const deleteTransaction = async (id) => {
  if (!id) {
    return { ok: false, error: 'Missing transaction id', status: 0, code: 'VALIDATION' };
  }
  const result = await request(`/api/transactions/${id}`, { method: 'DELETE' });
  return { ok: result.ok, error: result.error, status: result.status, code: result.code };
};

export const uploadReceipt = async (file, date) => {
  const formData = new FormData();
  formData.append('receipt', file);
  formData.append('date', date);

  const result = await request('/api/upload', { method: 'POST', body: formData });
  if (!result.ok) {
    return { ok: false, receiptUrl: null, error: result.error, status: result.status, code: result.code };
  }
  if (!result.data?.receiptUrl) {
    return {
      ok: false,
      receiptUrl: null,
      error: 'Invalid upload response',
      status: result.status,
      code: 'VALIDATION',
    };
  }
  return {
    ok: true,
    receiptUrl: result.data.receiptUrl,
    error: null,
    status: result.status,
    code: null,
  };
};

export const fetchConfig = async () => {
  const result = await request('/api/config');
  return {
    ok: result.ok,
    data: result.data,
    error: result.error,
    status: result.status,
    code: result.code,
  };
};

export const fetchUsers = async () => {
  const result = await request('/api/config/users');
  return {
    ok: result.ok,
    data: result.data,
    error: result.error,
    status: result.status,
    code: result.code,
  };
};

export const saveConfig = async (config) => {
  const result = await request('/api/config', {
    method: 'POST',
    body: JSON.stringify(config),
  });
  return { ok: result.ok, error: result.error, status: result.status, code: result.code };
};
