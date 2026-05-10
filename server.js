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

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const dbFile = path.join(dataDir, 'transactions.json');

// Initialize db from public if it doesn't exist
if (!fs.existsSync(dbFile)) {
  const publicDb = path.join(__dirname, 'public', 'transactions.json');
  if (fs.existsSync(publicDb)) {
    fs.copyFileSync(publicDb, dbFile);
  } else {
    fs.writeFileSync(dbFile, JSON.stringify([]));
  }
}

// Helper to read DB
const readDB = () => {
  try {
    const data = fs.readFileSync(dbFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

// Helper to write DB
const writeDB = (data) => {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
};

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const txDate = req.body.date || new Date().toISOString().split('T')[0];
    const monthFolder = txDate.substring(0, 7); // YYYY-MM
    
    const baseImgDir = path.join(dataDir, 'images');
    if (!fs.existsSync(baseImgDir)) {
      fs.mkdirSync(baseImgDir);
    }
    
    const imgDir = path.join(baseImgDir, monthFolder);
    if (!fs.existsSync(imgDir)) {
      fs.mkdirSync(imgDir);
    }
    cb(null, imgDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});
const upload = multer({ storage });

// Serve images statically
app.use('/images', express.static(path.join(dataDir, 'images')));

// API: Get all transactions
app.get('/api/transactions', (req, res) => {
  const txs = readDB();
  res.json(txs);
});

// API: Add or Update transaction
app.post('/api/transactions', (req, res) => {
  const txs = readDB();
  const payload = req.body;
  
  // Basic validation
  if (!payload.Amount || !payload.Date) {
    return res.status(400).json({ error: 'Amount and Date are required.' });
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

  writeDB(txs);
  res.json({ success: true, transaction: payload });
});

// API: Delete transaction
app.delete('/api/transactions/:index', (req, res) => {
  const txs = readDB();
  const index = parseInt(req.params.index, 10);
  
  if (!isNaN(index) && index >= 0 && index < txs.length) {
    txs.splice(index, 1);
    writeDB(txs);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid index' });
  }
});

// API: Upload receipt
app.post('/api/upload', upload.single('receipt'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const txDate = req.body.date || new Date().toISOString().split('T')[0];
  const monthFolder = txDate.substring(0, 7);
  
  const receiptUrl = `/images/${monthFolder}/${req.file.filename}`;
  res.json({ success: true, receiptUrl });
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
