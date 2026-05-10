import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const useGitHub = Boolean(GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO);

// GitHub API Helpers
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

// Merchant-to-Category auto-detection map
// Add new merchant fragments here (lowercase) to auto-categorize Apple Shortcut transactions
const MERCHANT_CATEGORY_MAP = {
  // Food & Dining
  "mcdonald": "Food",
  "haveli": "Food",
  "osmow": "Food",
  "taco bell": "Food",
  "five guys": "Food",
  "dairy queen": "Food",
  "domino": "Food",
  "despacito": "Food",
  "wok box": "Food",
  "starbucks": "Food",
  "skip the dishes": "Food",
  "uber eats": "Food",
  "doordash": "Food",
  "sauceplus": "Food",
  "sushi island": "Food",
  "olive branch": "Food",
  "quidi vidi": "Food",
  "tim hortons": "Food",
  "subway": "Food",
  "pizza": "Food",
  "wendy": "Food",
  "a&w": "Food",
  "popeye": "Food",
  "kfc": "Food",
  // Groceries
  "sobeys": "Groceries",
  "wal-mart": "Groceries",
  "walmart": "Groceries",
  "costco wholesale": "Groceries",
  "mega bazaar": "Groceries",
  "no frills": "Groceries",
  "loblaws": "Groceries",
  "superstore": "Groceries",
  // Car & Transportation
  "costco gas": "Car",
  "circle k": "Car",
  "esso": "Car",
  "shell": "Car",
  "petro": "Car",
  "parking": "Car",
  // Travel
  "easyjet": "Travel",
  "travix": "Travel",
  "air-serv": "Travel",
  "metrobus": "Travel",
  "airline": "Travel",
  "hotel": "Travel",
  "airbnb": "Travel",
  // Health
  "shoppers drug": "Health",
  "lawtons": "Health",
  "pharmacy": "Health",
  // Utilities
  "apple bill": "Utilities",
  "tidal": "Utilities",
  "netflix": "Utilities",
  "spotify": "Utilities",
  "scotia credit card protec": "Utilities",
  // Personal Items
  "sephora": "Personal Items",
  "klarna": "Personal Items",
  "marshalls": "Personal Items",
  "atlantic cannabis": "Personal Items",
  "herbal centre": "Personal Items",
  "uniqlo": "Personal Items",
  "afterpay": "Other",
  // Other
  "amazon": "Other",
  "cineplex": "Other",
  "best buy": "Other",
  "steam": "Other",
  "immigration": "Other",
  "mycreds": "Other"
};

// Auto-detect category from merchant name
const inferCategory = (merchant) => {
  if (!merchant) return "Other";
  const lower = merchant.toLowerCase();
  for (const [fragment, category] of Object.entries(MERCHANT_CATEGORY_MAP)) {
    if (lower.includes(fragment)) return category;
  }
  return "Other";
};

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const dbFile = path.join(dataDir, 'transactions.json');

// Initialize empty db if it doesn't exist
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify([]));
}

// Helper to read DB local
const readLocalDB = () => {
  try {
    const data = fs.readFileSync(dbFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

// Helper to write DB local
const writeLocalDB = (data) => {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
};

// Async DB Wrappers
const getTransactions = async () => {
  if (useGitHub) {
    try {
      const fileData = await fetchGitHubFile('data/transactions.json');
      if (fileData && fileData.content) {
        const decoded = Buffer.from(fileData.content, 'base64').toString('utf8');
        return JSON.parse(decoded);
      }
    } catch (e) {
      console.error('Failed to fetch from GitHub', e);
    }
    return [];
  }
  return readLocalDB();
};

const saveTransactions = async (txs, message = "Update transactions") => {
  if (useGitHub) {
    try {
      const fileData = await fetchGitHubFile('data/transactions.json');
      const sha = fileData ? fileData.sha : null;
      const contentStr = JSON.stringify(txs, null, 2);
      const contentBase64 = Buffer.from(contentStr).toString('base64');
      await putGitHubFile('data/transactions.json', contentBase64, message, sha);
    } catch (e) {
      console.error('Failed to save to GitHub', e);
    }
  } else {
    writeLocalDB(txs);
  }
};

// Multer storage config (memory for GitHub, or manual write)
const upload = multer({ storage: multer.memoryStorage() });

// Serve images statically
app.use('/images', express.static(path.join(dataDir, 'images')));

// API: Get all transactions
app.get('/api/transactions', async (req, res) => {
  const txs = await getTransactions();
  res.json(txs);
});

// API: Add or Update transaction
app.post('/api/transactions', async (req, res) => {
  const txs = await getTransactions();
  const payload = req.body;
  
  // Basic validation
  if (!payload.Amount || !payload.Date) {
    return res.status(400).json({ error: 'Amount and Date are required.' });
  }

  // Auto-categorize if category is missing (e.g. from Apple Shortcut)
  if (!payload.Category || payload.Category === '' || payload.Category === 'Other') {
    payload.Category = inferCategory(payload.Merchant);
  }

  // If payload has an index, it's an edit
  if (payload._index !== undefined) {
    const idx = payload._index;
    delete payload._index;
    if (txs[idx]) {
      txs[idx] = { ...txs[idx], ...payload };
    }
  } else {
    // New transaction (from Apple Shortcut or UI)
    // Add to beginning of array
    txs.unshift(payload);
    // Sort by date descending
    txs.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  }

  await saveTransactions(txs, "Add/Update transaction");
  res.json({ success: true, transaction: payload });
});

// API: Delete transaction
app.delete('/api/transactions/:index', async (req, res) => {
  const txs = await getTransactions();
  const index = parseInt(req.params.index, 10);
  
  if (!isNaN(index) && index >= 0 && index < txs.length) {
    txs.splice(index, 1);
    await saveTransactions(txs, "Delete transaction");
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid index' });
  }
});

// API: Upload receipt
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
    // Local save fallback
    const baseImgDir = path.join(dataDir, 'images');
    if (!fs.existsSync(baseImgDir)) fs.mkdirSync(baseImgDir);
    const imgDir = path.join(baseImgDir, monthFolder);
    if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir);
    
    fs.writeFileSync(path.join(imgDir, filename), req.file.buffer);
    res.json({ success: true, receiptUrl: `/images/${monthFolder}/${filename}` });
  }
});

// Serve static React files in production
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to index.html for SPA routing
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
