import { readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { cleanMerchant, inferCategory } from '../server/utils/merchant.js';

const CARD = 'AMEX Cobalt';
const TX_PATH = 'data/users/devansh/transactions.json';

const SKIP_PATTERNS = [
  /payment received/i,
  /transfer from installment/i,
  /^installment plan$/i,
];

const MONTHS = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

const toIsoDate = (raw) => {
  const m = String(raw).trim().match(/^(\d{2}) (\w{3}) (\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${MONTHS[m[2]]}-${m[1]}`;
};

/** Amex exports may wrap quoted address fields across lines. */
const extractRecords = (text) => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const records = [];
  let current = '';
  for (const line of lines) {
    if (/^\d{2} \w{3} \d{4},/.test(line)) {
      if (current) records.push(current);
      current = line;
    } else if (current) {
      current += `\n${line}`;
    }
  }
  if (current) records.push(current);
  return records;
};

const parseRecord = (record) => {
  const match = record.match(
    /^(\d{2} \w{3} \d{4}),\d{2} \w{3} \d{4},(.+),DEVANSH DALAL,-21007,(-?\d+(?:\.\d{1,2})?),/
  );
  if (!match) return null;

  const date = toIsoDate(match[1]);
  const description = match[2].trim();
  const amount = parseFloat(match[3]);
  if (!date || Number.isNaN(amount) || amount === 0) return null;

  if (SKIP_PATTERNS.some((p) => p.test(description))) return null;

  const merchant = cleanMerchant(description);
  const category = inferCategory(merchant);

  return { date, description, amount, merchant, category };
};

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const merchantsCompatible = (a, b) => {
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  // Rec Room / Cineplex Rec Room variants
  if (/rec room/.test(na) && /rec room/.test(nb)) return true;
  if (/cineplex/.test(na) && /cineplex/.test(nb)) return true;
  return false;
};

const findMatch = (charge, existing) => {
  const candidates = existing.filter(
    (t) =>
      t.Card === CARD &&
      t.Date === charge.date &&
      Math.abs(Number(t.Amount) - Math.abs(charge.amount)) < 0.01
  );

  if (!candidates.length) return null;

  const exact = candidates.find((t) => merchantsCompatible(t.Merchant, charge.merchant));
  if (exact) return exact;

  if (candidates.length === 1) return candidates[0];

  return null;
};

const loadCsvCharges = (paths) => {
  const charges = [];
  for (const path of paths) {
    const text = readFileSync(path, 'utf8');
    const header = text.split(/\r?\n/)[0];
    if (!header.startsWith('Date,')) throw new Error(`Unexpected CSV header in ${path}`);

    for (const record of extractRecords(text)) {
      if (record.startsWith('Date,')) continue;
      const parsed = parseRecord(record);
      if (parsed) charges.push(parsed);
    }
  }
  return charges;
};

const main = () => {
  const csvPaths = [
    'data/import/amex-cobalt-statement-1.csv',
    'data/import/amex-cobalt-statement-2.csv',
  ];

  const charges = loadCsvCharges(csvPaths);
  const existing = JSON.parse(readFileSync(TX_PATH, 'utf8'));

  const matched = [];
  const missing = [];
  const ambiguous = [];

  for (const charge of charges) {
    const hit = findMatch(charge, existing);
    if (hit) matched.push({ charge, hit });
    else {
      const loose = existing.filter(
        (t) =>
          t.Card === CARD &&
          t.Date === charge.date &&
          Math.abs(Number(t.Amount) - Math.abs(charge.amount)) < 0.01
      );
      if (loose.length > 1) ambiguous.push({ charge, loose });
      else missing.push(charge);
    }
  }

  console.log(`CSV charges (spending, excl. payments): ${charges.length}`);
  console.log(`Existing ${CARD} transactions: ${existing.filter((t) => t.Card === CARD).length}`);
  console.log(`Matched: ${matched.length}`);
  console.log(`Missing: ${missing.length}`);
  console.log(`Ambiguous: ${ambiguous.length}`);

  if (missing.length) {
    console.log('\nMissing transactions:');
    for (const c of missing) {
      console.log(`  ${c.date} | ${c.merchant} | $${c.amount} | ${c.category}`);
    }
  }

  if (ambiguous.length) {
    console.log('\nAmbiguous (need manual check):');
    for (const { charge, loose } of ambiguous) {
      console.log(
        `  ${charge.date} $${charge.amount} ${charge.merchant} -> [${loose.map((t) => t.Merchant).join(', ')}]`
      );
    }
  }

  const importFlag = process.argv.includes('--import');
  if (importFlag && missing.length) {
    const toAdd = missing.map((c) => ({
      Date: c.date,
      Month: null,
      Merchant: c.merchant,
      Amount: Math.abs(c.amount),
      Category: c.category,
      Card: CARD,
      Notes: c.amount < 0 ? `Refund: ${c.description}` : null,
      id: randomUUID(),
    }));

    const merged = [...toAdd, ...existing];
    merged.sort((a, b) => b.Date.localeCompare(a.Date) || a.Merchant.localeCompare(b.Merchant));
    writeFileSync(TX_PATH, `${JSON.stringify(merged, null, 2)}\n`);
    console.log(`\nImported ${toAdd.length} transactions. Total: ${merged.length}`);
  } else if (missing.length) {
    console.log('\nRun with --import to add missing transactions.');
  } else {
    console.log('\nAll statement charges are present.');
  }
};

main();
