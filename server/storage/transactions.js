import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { dataDir, useGitHub } from '../config.js';
import { normalizeDate } from '../utils/date.js';
import { readJsonFile, writeJsonFile } from './fileStore.js';

const dbFile = path.join(dataDir, 'transactions.json');
const GITHUB_PATH = 'data/transactions.json';

let cache = null;

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

const sortByDateDesc = (txs) =>
  [...txs].sort((a, b) => new Date(b.Date) - new Date(a.Date));

const prepareTransactions = async (raw) => {
  if (!Array.isArray(raw)) return [];

  const { txs: withIds, changed: idsChanged } = ensureIds(raw);
  const { txs: dated, changed: datesChanged } = normalizeDates(withIds);
  const sorted = sortByDateDesc(dated);

  if (idsChanged || datesChanged) {
    await writeJsonFile(dbFile, GITHUB_PATH, sorted, 'Normalize transaction records');
  }

  return sorted;
};

const loadFromSource = async () => {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify([]));

  const data = await readJsonFile(dbFile, GITHUB_PATH);
  const list = Array.isArray(data) ? data : [];
  console.log(`Loaded ${list.length} transactions.`);
  return prepareTransactions(list);
};

export const getTransactions = async () => {
  if (useGitHub && cache) return cache;
  cache = await loadFromSource();
  return cache;
};

export const saveTransactions = async (txs, message = 'Update transactions') => {
  const { txs: dated } = normalizeDates(txs);
  cache = sortByDateDesc(dated);
  await writeJsonFile(dbFile, GITHUB_PATH, cache, message);
  return cache;
};

export const upsertTransaction = async (payload) => {
  const txs = await getTransactions();
  const normalized = { ...payload };

  const isoDate = normalizeDate(normalized.Date);
  if (!isoDate) throw new Error('Invalid date');
  normalized.Date = isoDate;

  if (normalized.id) {
    const idx = txs.findIndex((tx) => tx.id === normalized.id);
    if (idx === -1) throw new Error('Transaction not found');
    txs[idx] = { ...txs[idx], ...normalized };
    await saveTransactions(txs, 'Update transaction');
    return txs[idx];
  }

  const created = { ...normalized, id: randomUUID() };
  txs.unshift(created);
  await saveTransactions(txs, 'Add transaction');
  return created;
};

export const deleteTransactionById = async (id) => {
  const txs = await getTransactions();
  const idx = txs.findIndex((tx) => tx.id === id);
  if (idx === -1) throw new Error('Transaction not found');
  txs.splice(idx, 1);
  await saveTransactions(txs, 'Delete transaction');
};

export const getDataFilePath = () => dbFile;
