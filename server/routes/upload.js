import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, useGitHub } from '../config.js';
import { putGitHubFile } from '../github.js';
import { normalizeDate } from '../utils/date.js';
import { validation, storageError } from '../errors.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { userPaths } from '../storage/paths.js';

const router = Router();
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

const writeLocalImage = (paths, monthFolder, filename, buffer) => {
  const imgDir = path.join(paths.imagesDir, monthFolder);
  fs.mkdirSync(imgDir, { recursive: true });
  fs.writeFileSync(path.join(imgDir, filename), buffer);
};

router.post(
  '/',
  (req, res, next) => {
    upload.single('receipt')(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(validation('File too large. Maximum size is 10 MB.'));
      }
      return next(validation(err.message || 'Upload failed'));
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) throw validation('No file uploaded');

    const paths = userPaths(req.userId);
    const txDate = normalizeDate(req.body.date) || new Date().toISOString().split('T')[0];
    const monthFolder = txDate.substring(0, 7);
    const ext = path.extname(req.file.originalname) || '.jpg';
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const relPath = `${paths.githubImagesPrefix}/${monthFolder}/${filename}`;
    const localUrl = `/images/${req.userId}/${monthFolder}/${filename}`;

    try {
      writeLocalImage(paths, monthFolder, filename, req.file.buffer);
    } catch (e) {
      throw storageError('Failed to save receipt locally', { cause: e });
    }

    if (useGitHub) {
      const base64Img = req.file.buffer.toString('base64');
      const putResult = await putGitHubFile(relPath, base64Img, `Upload receipt ${filename}`);
      if (!putResult.ok) {
        throw storageError(putResult.error || 'Failed to upload to GitHub');
      }
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${relPath}`;
      return res.json({ success: true, receiptUrl: rawUrl });
    }

    res.json({ success: true, receiptUrl: localUrl });
  })
);

export default router;
