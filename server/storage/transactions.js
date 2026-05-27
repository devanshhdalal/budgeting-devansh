import fs from 'fs';
import { randomUUID } from 'crypto';
import { useGitHub } from '../config.js';
import { normalizeDate } from '../utils/date.js';
import { readJsonFile, writeJsonFile } from './fileStore.js';
import { userPaths } from './paths.js';

const caches = new Map();

const ensureIds = (txs) => {
  let changed = false;
  const withIds = txs.map((tx) => {
    if (tx.id) return tx;
    changed = true;
    return { ...tx, id: randomUUID() };
  });
  return { txs: withIds, changed };
};

const normalizeDates = (txs) => {
  let changed = false;
  const normalized = txs.map((tx) => {
    const iso = normalizeDate(tx.Date);
    if (!iso) return tx;
    if (tx.Date !== iso) changed = true;
    return { ...tx, Date: iso };
  });
  return { txs: normalized, changed };
};

const sortByDateDesc = (txs) => [...txs].sort((a, b) => new Date(b.Date) - new Date(a.Date));

const prepareTransactions = async (userId, raw, paths) => {
  if (!Array.isArray(raw)) return [];

  const { txs: withIds, changed: idsChanged } = ensureIds(raw);
  const { txs: dated, changed: datesChanged } = normalizeDates(withIds);
  const sorted = sortByDateDesc(dated);

  if (idsChanged || datesChanged) {
    await writeJsonFile(
      paths.transactionsFile,
      paths.githubTransactions,
      sorted,
      `Normalize transactions (${userId})`
    );
  }

  return sorted;
};

const loadFromSource = async (userId) => {
  const paths = userPaths(userId);
  fs.mkdirSync(paths.userDir, { recursive: true });
  if (!fs.existsSync(paths.transactionsFile)) {
    fs.writeFileSync(paths.transactionsFile, JSON.stringify([]));
  }

  const data = await readJsonFile(paths.transactionsFile, paths.githubTransactions);
  const list = Array.isArray(data) ? data : [];
  console.log(`[${userId}] Loaded ${list.length} transactions.`);
  return prepareTransactions(userId, list, paths);
};

export const getTransactions = async (userId) => {
  if (useGitHub && caches.has(userId)) return caches.get(userId);
  const txs = await loadFromSource(userId);
  caches.set(userId, txs);
  return txs;
};

export const saveTransactions = async (userId, txs, message = 'Update transactions') => {
  const paths = userPaths(userId);
  const { txs: dated } = normalizeDates(txs);
  const sorted = sortByDateDesc(dated);
  caches.set(userId, sorted);
  await writeJsonFile(paths.transactionsFile, paths.githubTransactions, sorted, message);
  return sorted;
};

export const upsertTransaction = async (userId, payload) => {
  const txs = await getTransactions(userId);
  const normalized = { ...payload };

  const isoDate = normalizeDate(normalized.Date);
  if (!isoDate) throw new Error('Invalid date');
  normalized.Date = isoDate;
  delete normalized.User;
  delete normalized.user;

  if (normalized.id) {
    const idx = txs.findIndex((tx) => tx.id === normalized.id);
    if (idx === -1) throw new Error('Transaction not found');
    txs[idx] = { ...txs[idx], ...normalized };
    await saveTransactions(userId, txs, 'Update transaction');
    return txs[idx];
  }

  const created = { ...normalized, id: randomUUID() };
  txs.unshift(created);
  await saveTransactions(userId, txs, 'Add transaction');
  return created;
};

export const deleteTransactionById = async (userId, id) => {
  const txs = await getTransactions(userId);
  const idx = txs.findIndex((tx) => tx.id === id);
  if (idx === -1) throw new Error('Transaction not found');
  txs.splice(idx, 1);
  await saveTransactions(userId, txs, 'Delete transaction');
};

export const getDataFilePath = (userId) => userPaths(userId).transactionsFile;
