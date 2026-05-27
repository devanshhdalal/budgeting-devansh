import { Router } from 'express';
import { USERS } from '../config/users.js';
import { getConfig, saveConfig } from '../storage/config.js';

const router = Router();

router.get('/users', (_req, res) => {
  res.json(USERS);
});

router.get('/', async (req, res) => {
  const config = await getConfig(req.userId);
  if (config) res.json(config);
  else res.status(404).json({ error: 'Config not found' });
});

router.post('/', async (req, res) => {
  const success = await saveConfig(req.userId, req.body);
  if (success) res.json({ success: true });
  else res.status(500).json({ error: 'Failed to save config' });
});

export default router;
