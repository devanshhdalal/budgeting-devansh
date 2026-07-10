import { Router } from 'express';
import path from 'path';
import multer from 'multer';
import { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, useGitHub } from '../config.js';
import { normalizeDate } from '../utils/date.js';
import { validation, storageError } from '../errors.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { writeBinaryFile } from '../storage/fileStore.js';
import { userPaths } from '../storage/paths.js';

const router = Router();
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

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
    const localPath = path.join(paths.imagesDir, subfolder, filename);
    const localUrl = `/images/${req.userId}/${subfolder}/${filename}`;

    const writeResult = await writeBinaryFile(
      localPath,
      relPath,
      file.buffer,
      isCard ? `Upload card image ${filename}` : `Upload receipt ${filename}`
    );

    if (!writeResult.ok) {
      throw storageError(writeResult.error || 'Failed to save image');
    }

    const url = useGitHub
      ? `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${relPath}`
      : localUrl;

    res.json({
      success: true,
      receiptUrl: isCard ? undefined : url,
      imageUrl: isCard ? url : undefined,
      url,
    });
  })
);

export default router;
