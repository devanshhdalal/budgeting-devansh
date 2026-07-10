import { Router } from 'express';
import { USERS } from '../config/users.js';
import { getConfig, saveConfig } from '../storage/config.js';

const router = Router();

router.get('/users', (_req, res) => {
  res.json(USERS);
});

router.get('/', async (req, res) => {
  try {
    const config = await getConfig(req.userId);
    if (config) res.json(config);
    else res.status(404).json({ error: 'Config not found' });
  } catch (e) {
    console.error(`[${req.userId}] Failed to load config`, e);
    res.status(503).json({ error: e.message || 'Storage unavailable' });
  }
});

router.post('/', async (req, res) => {
  const result = await saveConfig(req.userId, req.body);
  if (result.ok) res.json({ success: true });
  else res.status(503).json({ error: result.error || 'Failed to save config' });
});

export default router;
