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

// ─── AUTH MIDDLEWARE ────────────────────────────────────────────────────────
const API_KEY = process.env.API_KEY;

const requireApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!API_KEY || key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Protect all /api routes
app.use('/api', requireApiKey);
// ────────────────────────────────────────────────────────────────────────────

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const useGitHub = Boolean(GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO);

// ─── GITHUB API HELPERS ─────────────────────────────────────────────────────
const fetchGitHubFile = async (filePath) => {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Budgeting-App'
    }
  });
  if (!response.ok) return null;
  return await response.json();
};

const putGitHubFile = async (filePath, contentBase64, message, sha = null) => {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
  const body = {
    message,
    content: contentBase64,
    branch: GITHUB_BRANCH
  };
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
// ────────────────────────────────────────────────────────────────────────────

// ─── MERCHANT → CATEGORY MAP ─────────────────────────────────────────────────
// Add new merchant fragments here (lowercase) to auto-categorize transactions
const MERCHANT_CATEGORY_MAP = {
  // Food & Dining
  "mcdonald":             "Food",
  "haveli":               "Food",
  "osmow":                "Food",
  "taco bell":            "Food",
  "five guys":            "Food",
  "dairy queen":          "Food",
  "domino":               "Food",
  "despacito":            "Food",
  "wok box":              "Food",
  "starbucks":            "Food",
  "skip the dishes":      "Food",
  "uber eats":            "Food",
  "doordash":             "Food",
  "sushi island":         "Food",
  "olive branch":         "Food",
  "quidi vidi":           "Food",
  "tim hortons":          "Food",
  "subway":               "Food",
  "pizza":                "Food",
  "wendy":                "Food",
  "a&w":                  "Food",
  "popeye":               "Food",
  "kfc":                  "Food",
  "burger":               "Food",
  "restaurant":           "Food",
  "cafe":                 "Food",
  // Groceries
  "sobeys":               "Groceries",
  "wal-mart":             "Groceries",
  "walmart":              "Groceries",
  "costco wholesale":     "Groceries",
  "mega bazaar":          "Groceries",
  "no frills":            "Groceries",
  "loblaws":              "Groceries",
  "superstore":           "Groceries",
  // Car & Transportation
  "costco gas":           "Car",
  "circle k":             "Car",
  "esso":                 "Car",
  "shell":                "Car",
  "petro":                "Car",
  "parking":              "Car",
  "gas bar":              "Car",
  // Travel
  "easyjet":              "Travel",
  "travix":               "Travel",
  "air-serv":             "Travel",
  "metrobus":             "Travel",
  "airline":              "Travel",
  "hotel":                "Travel",
  "airbnb":               "Travel",
  "expedia":              "Travel",
  "booking.com":          "Travel",
  // Health
  "shoppers drug":        "Health",
  "lawtons":              "Health",
  "pharmacy":             "Health",
  "rexall":               "Health",
  // Utilities
  "apple bill":           "Utilities",
  "netflix":              "Utilities",
  "spotify":              "Utilities",
  "scotia credit card protec": "Utilities",
  "hydro":                "Utilities",
  "internet":             "Utilities",
  // Subscriptions
  "sauceplus":            "Subscriptions",
  "tidal":                "Subscriptions",
  "disney+":              "Subscriptions",
  "crave":                "Subscriptions",
  "youtube premium":      "Subscriptions",
  "amazon prime":         "Subscriptions",
  // Personal Items
  "sephora":              "Personal Items",
  "klarna":               "Personal Items",
  "marshalls":            "Personal Items",
  "atlantic cannabis":    "Personal Items",
  "herbal centre":        "Personal Items",
  "uniqlo":               "Personal Items",
  "afterpay":             "Other",
  // Other
  "amazon":               "Other",
  "cineplex":             "Other",
  "best buy":             "Other",
  "steam":                "Other",
  "immigration":          "Other",
  "mycreds":              "Other"
};

// Pre-sort longest-first so specific fragments match before generic ones
// e.g. "costco gas" → Car before a hypothetical "costco" could match
const SORTED_MERCHANT_ENTRIES = Object.entries(MERCHANT_CATEGORY_MAP)
  .sort((a, b) => b[0].length - a[0].length);

// Auto-detect category from merchant name
const inferCategory = (merchant) => {
  if (!merchant) return "Other";
  const lower = merchant.toLowerCase();
  for (const [fragment, category] of SORTED_MERCHANT_ENTRIES) {
    if (lower.includes(fragment)) return category;
  }
  return "Other";
};
// ────────────────────────────────────────────────────────────────────────────

// ─── LOCAL STORAGE SETUP ────────────────────────────────────────────────────
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const dbFile = path.join(dataDir, 'transactions.json');
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify([]));

const readLocalDB = () => {
  try {
    return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  } catch {
    return [];
  }
};

const writeLocalDB = (data) => {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
};
// ────────────────────────────────────────────────────────────────────────────

// ─── IN-MEMORY CACHE (avoids hammering GitHub API on every GET) ──────────────
let cache = null;

const getTransactions = async () => {
  if (cache) return cache;
  if (useGitHub) {
    try {
      const fileData = await fetchGitHubFile('data/transactions.json');
      if (fileData && fileData.content) {
        const decoded = Buffer.from(fileData.content, 'base64').toString('utf8');
        cache = JSON.parse(decoded);
        return cache;
      }
    } catch (e) {
      console.error('Failed to fetch from GitHub', e);
    }
    return [];
  }
  cache = readLocalDB();
  return cache;
};

const saveTransactions = async (txs, message = "Update transactions") => {
  cache = txs; // keep cache in sync on every write
  if (useGitHub) {
    try {
      const fileData = await fetchGitHubFile('data/transactions.json');
      const sha = fileData ? fileData.sha : null;
      const contentBase64 = Buffer.from(JSON.stringify(txs, null, 2)).toString('base64');
      await putGitHubFile('data/transactions.json', contentBase64, message, sha);
    } catch (e) {
      console.error('Failed to save to GitHub', e);
    }
  } else {
    writeLocalDB(txs);
  }
};
// ────────────────────────────────────────────────────────────────────────────

const upload = multer({ storage: multer.memoryStorage() });

// Serve receipt images statically
app.use('/images', express.static(path.join(dataDir, 'images')));

// ─── ROUTES ──────────────────────────────────────────────────────────────────

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

  // Auto-categorize if category is missing or generic
  if (!payload.Category || payload.Category === '' || payload.Category === 'Other') {
    payload.Category = inferCategory(payload.Merchant);
  }

  if (payload._index !== undefined) {
    // Edit existing transaction by index
    const idx = payload._index;
    delete payload._index;
    if (txs[idx]) {
      txs[idx] = { ...txs[idx], ...payload };
    }
  } else {
    // New transaction — assign a stable UUID so deletes don't rely on shifting indices
    payload.id = randomUUID();
    txs.unshift(payload);
    txs.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  }

  await saveTransactions(txs, "Add/Update transaction");
  res.json({ success: true, transaction: payload });
});

// DELETE by UUID (stable, race-condition-safe)
app.delete('/api/transactions/:id', async (req, res) => {
  const txs = await getTransactions();
  const { id } = req.params;
  const idx = txs.findIndex(tx => tx.id === id);

  if (idx === -1) {
    // Fallback: support legacy numeric index for backwards compatibility
    const numIdx = parseInt(id, 10);
    if (!isNaN(numIdx) && numIdx >= 0 && numIdx < txs.length) {
      txs.splice(numIdx, 1);
      await saveTransactions(txs, "Delete transaction");
      return res.json({ success: true });
    }
    return res.status(404).json({ error: 'Transaction not found' });
  }

  txs.splice(idx, 1);
  await saveTransactions(txs, "Delete transaction");
  res.json({ success: true });
});

// POST — upload receipt image
app.post('/api/upload', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

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
    } else {
      return res.status(500).json({ error: 'Failed to upload to GitHub' });
    }
  } else {
    const baseImgDir = path.join(dataDir, 'images');
    if (!fs.existsSync(baseImgDir)) fs.mkdirSync(baseImgDir);
    const imgDir = path.join(baseImgDir, monthFolder);
    if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir);
    fs.writeFileSync(path.join(imgDir, filename), req.file.buffer);
    res.json({ success: true, receiptUrl: `/images/${monthFolder}/${filename}` });
  }
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
