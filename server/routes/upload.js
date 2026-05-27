import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { dataDir, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, useGitHub } from '../config.js';
import { putGitHubFile } from '../github.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('receipt'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const txDate = req.body.date || new Date().toISOString().split('T')[0];
  const monthFolder = txDate.substring(0, 7);
  const ext = path.extname(req.file.originalname);
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
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
  if (!fs.existsSync(baseImgDir)) fs.mkdirSync(baseImgDir, { recursive: true });
  const imgDir = path.join(baseImgDir, monthFolder);
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
  fs.writeFileSync(path.join(imgDir, filename), req.file.buffer);
  res.json({ success: true, receiptUrl: `/images/${monthFolder}/${filename}` });
});

export default router;
