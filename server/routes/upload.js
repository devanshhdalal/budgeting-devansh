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
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

const writeLocalImage = (paths, subfolder, filename, buffer) => {
  const imgDir = path.join(paths.imagesDir, subfolder);
  fs.mkdirSync(imgDir, { recursive: true });
  fs.writeFileSync(path.join(imgDir, filename), buffer);
};

const extFromMime = (mime, originalName) => {
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (originalName && path.extname(originalName)) return path.extname(originalName);
  return '.jpg';
};

router.post(
  '/',
  (req, res, next) => {
    upload.fields([
      { name: 'receipt', maxCount: 1 },
      { name: 'cardImage', maxCount: 1 },
    ])(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(validation('File too large. Maximum size is 10 MB.'));
      }
      return next(validation(err.message || 'Upload failed'));
    });
  },
  asyncHandler(async (req, res) => {
    const receiptFile = req.files?.receipt?.[0];
    const cardFile = req.files?.cardImage?.[0];
    const file = cardFile || receiptFile;
    if (!file) throw validation('No file uploaded');
    if (!IMAGE_TYPES.has(file.mimetype) && !file.mimetype.startsWith('image/')) {
      throw validation('File must be an image');
    }

    const paths = userPaths(req.userId);
    const isCard = Boolean(cardFile);
    const txDate = normalizeDate(req.body.date) || new Date().toISOString().split('T')[0];
    const subfolder = isCard ? 'cards' : txDate.substring(0, 7);
    const ext = extFromMime(file.mimetype, file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const relPath = `${paths.githubImagesPrefix}/${subfolder}/${filename}`;
    const localUrl = `/images/${req.userId}/${subfolder}/${filename}`;

    try {
      writeLocalImage(paths, subfolder, filename, file.buffer);
    } catch (e) {
      throw storageError(`Failed to save ${isCard ? 'card image' : 'receipt'} locally`, { cause: e });
    }

    if (useGitHub) {
      const base64Img = file.buffer.toString('base64');
      const putResult = await putGitHubFile(
        relPath,
        base64Img,
        isCard ? `Upload card image ${filename}` : `Upload receipt ${filename}`
      );
      if (!putResult.ok) {
        throw storageError(putResult.error || 'Failed to upload to GitHub');
      }
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${relPath}`;
      return res.json({
        success: true,
        receiptUrl: isCard ? undefined : rawUrl,
        imageUrl: isCard ? rawUrl : undefined,
        url: rawUrl,
      });
    }

    res.json({
      success: true,
      receiptUrl: isCard ? undefined : localUrl,
      imageUrl: isCard ? localUrl : undefined,
      url: localUrl,
    });
  })
);

export default router;
