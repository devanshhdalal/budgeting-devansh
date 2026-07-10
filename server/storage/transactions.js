import fs from 'fs';
import { randomUUID, createHash } from 'crypto';
import { normalizeDate } from '../utils/date.js';
import { notFound, storageError, validation } from '../errors.js';
import { readJsonFile, writeJsonFile } from './fileStore.js';
import { userPaths } from './paths.js';

const caches = new Map();

const sortByDateDesc = (txs) => [...txs].sort((a, b) => (a.Date < b.Date ? 1 : -1));

const normalizeAll = (raw) => {
  let changed = false;
  const txs = raw.map((tx) => {
    const next = { ...tx };
    if (!next.id) {
      next.id = randomUUID();
      changed = true;
    }
    const iso = normalizeDate(next.Date);
    if (iso && next.Date !== iso) {
      next.Date = iso;
      changed = true;
    }
    return next;
  });
  return { txs, changed };
};

const persist = async (userId, txs, message) => {
  const paths = userPaths(userId);
  const result = await writeJsonFile(
    paths.transactionsFile,
    paths.githubTransactions,
    txs,
    message
  );

  if (!result.ok) {
    throw storageError(result.error || 'Failed to persist transactions');
  }

  caches.set(userId, txs);
};

const loadFromSource = async (userId) => {
  const paths = userPaths(userId);
  fs.mkdirSync(paths.userDir, { recursive: true });

  const raw = await readJsonFile(paths.transactionsFile, paths.githubTransactions);

  if (raw !== null && !Array.isArray(raw)) {
    throw storageError('Invalid transactions file format');
  }

  const list = Array.isArray(raw) ? raw : [];
  const { txs, changed } = normalizeAll(list);
  const sorted = sortByDateDesc(txs);
  console.log(`[${userId}] Loaded ${sorted.length} transactions.`);

  if (changed) {
    await persist(userId, sorted, `Normalize transactions (${userId})`);
  } else {
    caches.set(userId, sorted);
  }
  return sorted;
};

export const getTransactions = async (userId, { includeTest = false } = {}) => {
  const txs = caches.has(userId) ? caches.get(userId) : await loadFromSource(userId);
  if (includeTest) return txs;
  return txs.filter((tx) => !tx.IsTest);
};

export const buildDedupKey = (source, merchant, amount, date) => {
  const rounded = normalizeDate(date) || String(date).slice(0, 10);
  const payload = `${source}|${merchant}|${amount}|${rounded}`;
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
};

export const findDuplicate = (txs, dedupKey, withinHours = 24) => {
  const cutoff = Date.now() - withinHours * 60 * 60 * 1000;
  return txs.find((tx) => {
    if (tx.DedupKey !== dedupKey) return false;
    const created = tx.CreatedAt ? new Date(tx.CreatedAt).getTime() : Date.now();
    return created >= cutoff;
  });
};

export const upsertTransaction = async (userId, payload) => {
  const iso = normalizeDate(payload.Date);
  if (!iso) throw validation('Invalid date');

  // eslint-disable-next-line no-unused-vars
  const { User, user, Month, ...rest } = payload;
  const normalized = { ...rest, Date: iso, CreatedAt: rest.CreatedAt || new Date().toISOString() };

  const txs = await getTransactions(userId, { includeTest: true });

  if (normalized.DedupKey) {
    const dup = findDuplicate(txs, normalized.DedupKey);
    if (dup && !normalized.id) return dup;
  }

  if (normalized.id) {
    const idx = txs.findIndex((tx) => tx.id === normalized.id);
    if (idx === -1) throw notFound('Transaction not found');
    const updated = { ...txs[idx], ...normalized };
    const next = sortByDateDesc(txs.map((tx, i) => (i === idx ? updated : tx)));
    await persist(userId, next, `Update transaction (${userId})`);
    return updated;
  }

  const created = { ...normalized, id: randomUUID() };
  const next = sortByDateDesc([created, ...txs]);
  await persist(userId, next, `Add transaction (${userId})`);
  return created;
};

export const deleteTransactionById = async (userId, id) => {
  const txs = await getTransactions(userId, { includeTest: true });
  if (!txs.some((tx) => tx.id === id)) {
    throw notFound('Transaction not found');
  }
  await persist(userId, txs.filter((tx) => tx.id !== id), `Delete transaction (${userId})`);
};
