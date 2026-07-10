import { Router } from 'express';
import { USERS } from '../config/users.js';
import { validation, storageError } from '../errors.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getConfig, saveConfig } from '../storage/config.js';
import { validateConfigShape } from '../utils/validateConfig.js';

const router = Router();

router.get('/users', (_req, res) => {
  res.json(USERS);
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const config = await getConfig(req.userId);
    if (config) res.json(config);
    else res.status(404).json({ error: 'Config not found', code: 'NOT_FOUND' });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const shapeError = validateConfigShape(req.body);
    if (shapeError) throw validation(shapeError);

    const result = await saveConfig(req.userId, req.body);
    if (!result.ok) {
      throw storageError(result.error || 'Failed to save config');
    }
    res.json({ success: true });
  })
);

export default router;
