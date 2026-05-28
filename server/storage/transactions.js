import fs from 'fs';
import { randomUUID } from 'crypto';
import { normalizeDate } from '../utils/date.js';
import { readJsonFile, writeJsonFile } from './fileStore.js';
import { userPaths } from './paths.js';

const caches = new Map();

const sortByDateDesc = (txs) => [...txs].sort((a, b) => (a.Date < b.Date ? 1 : -1));

/** Add UUIDs and normalize dates, reporting whether anything changed. */
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

const persist = (userId, txs, message) => {
  const paths = userPaths(userId);
  caches.set(userId, txs);
  return writeJsonFile(paths.transactionsFile, paths.githubTransactions, txs, message);
};

const loadFromSource = async (userId) => {
  const paths = userPaths(userId);
  fs.mkdirSync(paths.userDir, { recursive: true });
  if (!fs.existsSync(paths.transactionsFile)) {
    fs.writeFileSync(paths.transactionsFile, '[]');
  }

  const raw = await readJsonFile(paths.transactionsFile, paths.githubTransactions);
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

export const getTransactions = async (userId) => {
  if (caches.has(userId)) return caches.get(userId);
  return loadFromSource(userId);
};

export const upsertTransaction = async (userId, payload) => {
  const iso = normalizeDate(payload.Date);
  if (!iso) throw new Error('Invalid date');

  // eslint-disable-next-line no-unused-vars
  const { User, user, ...rest } = payload;
  const normalized = { ...rest, Date: iso };

  const txs = await getTransactions(userId);

  if (normalized.id) {
    const idx = txs.findIndex((tx) => tx.id === normalized.id);
    if (idx === -1) throw new Error('Transaction not found');
    const updated = { ...txs[idx], ...normalized };
    const next = sortByDateDesc(txs.map((tx, i) => (i === idx ? updated : tx)));
    await persist(userId, next, 'Update transaction');
    return updated;
  }

  const created = { ...normalized, id: randomUUID() };
  const next = sortByDateDesc([created, ...txs]);
  await persist(userId, next, 'Add transaction');
  return created;
};

export const deleteTransactionById = async (userId, id) => {
  const txs = await getTransactions(userId);
  if (!txs.some((tx) => tx.id === id)) {
    throw new Error('Transaction not found');
  }
  await persist(userId, txs.filter((tx) => tx.id !== id), 'Delete transaction');
};
