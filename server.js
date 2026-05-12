import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
const API_KEY = process.env.API_KEY;

const requireApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'];
  // Only enforce the check if an API_KEY is defined in the environment (e.g. on Render)
  if (API_KEY && key !== API_KEY) {
    console.warn(`Unauthorized request blocked. Key provided: ${key ? 'Yes' : 'No'}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.use('/api', requireApiKey);
// ─────────────────────────────────────────────────────────────────────────────

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_OWNER  = process.env.GITHUB_OWNER;
const GITHUB_REPO   = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const useGitHub = Boolean(GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO);

console.log(`Storage Mode: ${useGitHub ? 'GitHub' : 'Local Disk'}`);
if (useGitHub) {
  console.log(`GitHub Config: ${GITHUB_OWNER}/${GITHUB_REPO} [${GITHUB_BRANCH}]`);
}

// ─── GITHUB API HELPERS ───────────────────────────────────────────────────────
const fetchGitHubFile = async (filePath) => {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Budgeting-App'
      }
    });
    if (!response.ok) {
      console.error(`GitHub Fetch Error: ${response.status} ${response.statusText} for ${filePath}`);
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error(`Network Error fetching from GitHub: ${err.message}`);
    return null;
  }
};

const putGitHubFile = async (filePath, contentBase64, message, sha = null) => {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
  const body = { message, content: contentBase64, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Budgeting-App',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return response.ok;
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── MERCHANT CLEANING RULES (regex, clean name) ─────────────────────────────
// Rules are applied in order; first match wins.
// Longer/more-specific patterns come before generic ones.
const CLEAN_RULES = [
  // ── Groceries ──
  [/costco\s+gas/i,                         'Costco Gas'],
  [/costco\s+wholesale|www\s+costco/i,      'Costco Wholesale'],
  [/wal-?mart\s*\d*/i,                      'Walmart'],
  [/sobeys(\s+#\d+)?/i,                     'Sobeys'],
  // ── Food ──
  [/mcdonald'?s?(\s+#?\d+|\s+canada)?/i,   "McDonald's"],
  [/quidi\s+vidi/i,                         'Quidi Vidi Brewing'],
  [/haveli\s+restaurant/i,                  'Haveli Restaurant'],
  [/osmow'?s?/i,                            "Osmow's"],
  [/despacito\s+bakery/i,                   'Despacito Bakery'],
  [/wok\s+box/i,                            'Wok Box'],
  [/dairy\s+queen/i,                        'Dairy Queen'],
  [/five\s+guys/i,                          'Five Guys'],
  [/taco\s+bell/i,                          'Taco Bell'],
  [/domino'?s?(\s+pizza)?/i,               "Domino's Pizza"],
  [/uber\s+eats/i,                          'Uber Eats'],
  [/skip\s+the\s+dishes/i,                 'Skip The Dishes'],
  [/doordash/i,                             'DoorDash'],
  [/starbucks/i,                            'Starbucks'],
  [/sushi\s+island/i,                       'Sushi Island'],
  [/olive\s+branch/i,                       'The Olive Branch'],
  [/rec\s*room/i,                           'Rec Room'],
  // ── Car ──
  [/per\s+use\s+parking|parking/i,         'Parking'],
  [/circle\s+k/i,                           'Circle K'],
  // ── Travel ──
  [/air-serv/i,                             'Air-Serv'],
  [/easyjet/i,                              'EasyJet'],
  [/travix/i,                               'Travix'],
  [/metrobus/i,                             'Metrobus'],
  // ── Health ──
  [/shoppers\s+drug|shoppers/i,             'Shoppers Drug Mart'],
  [/lawtons/i,                              'Lawtons'],
  // ── Personal Items ──
  [/sephora/i,                              'Sephora'],
  [/atlantic\s+cannabis/i,                  'Atlantic Cannabis'],
  [/herbal\s+centre/i,                      'The Herbal Centre'],
  [/marshalls/i,                            'Marshalls'],
  [/uniqlo/i,                               'Uniqlo'],
  [/temu/i,                                 'Temu'],
  [/afterpay/i,                             'Afterpay'],
  [/klarna/i,                               'Klarna'],           // generic Klarna (no sub-merchant)
  // ── Utilities ──
  [/apple\s+bill/i,                         'Apple Bill'],
  [/scotia\s+credit\s+card/i,              'Scotia CC Protection'],
  // ── Subscriptions ──
  [/sauceplus/i,                            'SaucePlus'],
  [/tidal/i,                                'Tidal'],
  [/disney\+/i,                             'Disney+'],
  [/crave/i,                                'Crave'],
  [/youtube\s+premium/i,                   'YouTube Premium'],
  [/amazon\s+prime/i,                       'Amazon Prime'],
  // ── Other ──
  [/amzn\s+mktp|amazon\s+mktp|amazon/i,   'Amazon'],
  [/cineplex/i,                             'Cineplex'],
  [/best\s+buy/i,                           'Best Buy'],
  [/steam/i,                                'Steam'],
  [/immigration\s+canada/i,               'Immigration Canada'],
  [/mycreds|mycredsmescertif/i,            'MyCreds'],
];

// Strip common prefixes added by payment processors
const STRIP_PREFIXES = [
  /^sq\s+\*/i,         // Square: "Sq *Merchant"
  /^ls\s+/i,           // Location prefix: "LS Five Guys"
  /^klarna\*\s*/i,     // Klarna buy-now-pay-later: "Klarna*Sephora"
];

/**
 * cleanMerchant(raw) → human-readable merchant name
 * Strips payment-processor prefixes, matches known merchants via regex,
 * and falls back to a title-cased stripped string.
 */
const cleanMerchant = (raw) => {
  if (!raw) return 'Unknown';
  let s = raw.trim();

  // 1. Strip known processor prefixes
  for (const prefix of STRIP_PREFIXES) {
    s = s.replace(prefix, '').trim();
  }

  // 2. Match known merchant patterns
  for (const [pattern, name] of CLEAN_RULES) {
    if (pattern.test(s)) return name;
  }

  // 3. Fallback: strip trailing city/province/country noise, title-case
  s = s
    .replace(/\s+(st\.?\s*john'?s?|can|ni|bc|ab|on|mb|toronto|vancouver|calgary|ottawa|winnipeg|mount\s+pearl)\b.*/i, '')
    .replace(/\s+#?\d+.*$/, '')
    .trim();
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
};

// ─── CATEGORY MAP (clean name → category) ────────────────────────────────────
const CATEGORY_MAP = {
  'Costco Gas':           'Car',
  'Costco Wholesale':     'Groceries',
  'Walmart':              'Groceries',
  'Sobeys':               'Groceries',
  "McDonald's":           'Food',
  'Quidi Vidi Brewing':   'Food',
  'Haveli Restaurant':    'Food',
  "Osmow's":              'Food',
  'Despacito Bakery':     'Food',
  'Wok Box':              'Food',
  'Dairy Queen':          'Food',
  'Five Guys':            'Food',
  'Taco Bell':            'Food',
  "Domino's Pizza":       'Food',
  'Uber Eats':            'Food',
  'Skip The Dishes':      'Food',
  'DoorDash':             'Food',
  'Starbucks':            'Food',
  'Sushi Island':         'Food',
  'The Olive Branch':     'Food',
  'Parking':              'Car',
  'Circle K':             'Car',
  'Air-Serv':             'Travel',
  'EasyJet':              'Travel',
  'Travix':               'Travel',
  'Metrobus':             'Travel',
  'Shoppers Drug Mart':   'Health',
  'Lawtons':              'Health',
  'Sephora':              'Personal Items',
  'Atlantic Cannabis':    'Personal Items',
  'The Herbal Centre':    'Personal Items',
  'Marshalls':            'Personal Items',
  'Uniqlo':               'Personal Items',
  'Temu':                 'Personal Items',
  'Afterpay':             'Other',
  'Klarna':               'Personal Items',
  'Apple Bill':           'Utilities',
  'Scotia CC Protection': 'Utilities',
  'SaucePlus':            'Subscriptions',
  'Tidal':                'Subscriptions',
  'Disney+':              'Subscriptions',
  'Crave':                'Subscriptions',
  'YouTube Premium':      'Subscriptions',
  'Amazon Prime':         'Subscriptions',
  'Amazon':               'Other',
  'Rec Room':             'Food',
  'Cineplex Rec Room':    'Food',
  'Cineplex':             'Other',
  'Best Buy':             'Other',
  'Steam':                'Other',
  'Immigration Canada':   'Other',
  'MyCreds':              'Other',
};

/**
 * inferCategory(cleanName) → category string
 */
const inferCategory = (cleanName) => {
  if (!cleanName) return 'Other';
  return CATEGORY_MAP[cleanName] ?? 'Other';
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── LOCAL STORAGE ────────────────────────────────────────────────────────────
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const dbFile = path.join(dataDir, 'transactions.json');
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify([]));

const readLocalDB = () => {
  try { return JSON.parse(fs.readFileSync(dbFile, 'utf8')); }
  catch { return []; }
};

const writeLocalDB = (data) => {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── IN-MEMORY CACHE ─────────────────────────────────────────────────────────
let cache = null;

const getTransactions = async () => {
  if (cache) return cache;
  if (useGitHub) {
    try {
      const fileData = await fetchGitHubFile('data/transactions.json');
      if (fileData?.content) {
        cache = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
        console.log(`Fetched ${cache.length} transactions from GitHub.`);
        return cache;
      }
    } catch (e) { console.error('Failed to fetch from GitHub', e); }
    console.warn('GitHub fetch returned no data or failed. Falling back to empty array.');
    return [];
  }
  cache = readLocalDB();
  console.log(`Fetched ${cache.length} transactions from Local DB.`);
  return cache;
};

const saveTransactions = async (txs, message = 'Update transactions') => {
  cache = txs;
  if (useGitHub) {
    try {
      const fileData = await fetchGitHubFile('data/transactions.json');
      const sha = fileData ? fileData.sha : null;
      const contentBase64 = Buffer.from(JSON.stringify(txs, null, 2)).toString('base64');
      await putGitHubFile('data/transactions.json', contentBase64, message, sha);
    } catch (e) { console.error('Failed to save to GitHub', e); }
  } else {
    writeLocalDB(txs);
  }
};
// ─────────────────────────────────────────────────────────────────────────────

const upload = multer({ storage: multer.memoryStorage() });

app.use('/images', express.static(path.join(dataDir, 'images')));

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// GET all transactions
app.get('/api/transactions', async (req, res) => {
  const txs = await getTransactions();
  res.json(txs);
});

// POST — add or update a transaction
app.post('/api/transactions', async (req, res) => {
  const txs = await getTransactions();
  const payload = { ...req.body };

  // Sanitize Amount — strips $, CAD, spaces, etc. (handles Apple Shortcut strings)
  payload.Amount = parseFloat(String(payload.Amount).replace(/[^0-9.]/g, ''));
  if (isNaN(payload.Amount)) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  if (!payload.Date) {
    return res.status(400).json({ error: 'Date is required.' });
  }

  // Clean merchant name and auto-categorize
  payload.Merchant = cleanMerchant(payload.Merchant);
  if (!payload.Category || payload.Category === '' || payload.Category === 'Other') {
    payload.Category = inferCategory(payload.Merchant);
  }

  if (payload._index !== undefined) {
    // Edit existing by index (from UI)
    const idx = payload._index;
    delete payload._index;
    if (txs[idx]) txs[idx] = { ...txs[idx], ...payload };
  } else {
    // New transaction — assign stable UUID
    payload.id = randomUUID();
    txs.unshift(payload);
    txs.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  }

  await saveTransactions(txs, 'Add/Update transaction');
  res.json({ success: true, transaction: payload });
});

// DELETE by UUID (stable, race-condition-safe)
app.delete('/api/transactions/:id', async (req, res) => {
  const txs = await getTransactions();
  const { id } = req.params;
  const idx = txs.findIndex(tx => tx.id === id);

  if (idx === -1) {
    // Fallback: support legacy numeric index
    const numIdx = parseInt(id, 10);
    if (!isNaN(numIdx) && numIdx >= 0 && numIdx < txs.length) {
      txs.splice(numIdx, 1);
      await saveTransactions(txs, 'Delete transaction');
      return res.json({ success: true });
    }
    return res.status(404).json({ error: 'Transaction not found' });
  }

  txs.splice(idx, 1);
  await saveTransactions(txs, 'Delete transaction');
  res.json({ success: true });
});

// POST — upload receipt image
app.post('/api/upload', upload.single('receipt'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const txDate = req.body.date || new Date().toISOString().split('T')[0];
  const monthFolder = txDate.substring(0, 7);
  const ext = path.extname(req.file.originalname);
  const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
  const relPath = `data/images/${monthFolder}/${filename}`;

  if (useGitHub) {
    const base64Img = req.file.buffer.toString('base64');
    const success = await putGitHubFile(relPath, base64Img, `Upload receipt ${filename}`);
    if (success) {
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${relPath}`;
      return res.json({ success: true, receiptUrl: rawUrl });
    }
    return res.status(500).json({ error: 'Failed to upload to GitHub' });
  }

  const baseImgDir = path.join(dataDir, 'images');
  if (!fs.existsSync(baseImgDir)) fs.mkdirSync(baseImgDir);
  const imgDir = path.join(baseImgDir, monthFolder);
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir);
  fs.writeFileSync(path.join(imgDir, filename), req.file.buffer);
  res.json({ success: true, receiptUrl: `/images/${monthFolder}/${filename}` });
});

// Serve static React build
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
