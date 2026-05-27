import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, useGitHub } from '../config.js';
import { putGitHubFile } from '../github.js';
import { userPaths } from '../storage/paths.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('receipt'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const paths = userPaths(req.userId);
  const txDate = req.body.date || new Date().toISOString().split('T')[0];
  const monthFolder = txDate.substring(0, 7);
  const ext = path.extname(req.file.originalname);
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const relPath = `${paths.githubImagesPrefix}/${monthFolder}/${filename}`;

  if (useGitHub) {
    const base64Img = req.file.buffer.toString('base64');
    const success = await putGitHubFile(relPath, base64Img, `Upload receipt ${filename}`);
    if (success) {
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${relPath}`;
      return res.json({ success: true, receiptUrl: rawUrl });
    }
    return res.status(500).json({ error: 'Failed to upload to GitHub' });
  }

  const imgDir = path.join(paths.imagesDir, monthFolder);
  fs.mkdirSync(imgDir, { recursive: true });
  fs.writeFileSync(path.join(imgDir, filename), req.file.buffer);
  res.json({ success: true, receiptUrl: `/images/${req.userId}/${monthFolder}/${filename}` });
});

export default router;
