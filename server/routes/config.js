import { Router } from 'express';
import { getConfig, saveConfig } from '../storage/config.js';

const router = Router();

router.get('/', async (_req, res) => {
  const config = await getConfig();
  if (config) res.json(config);
  else res.status(404).json({ error: 'Config not found' });
});

router.post('/', async (req, res) => {
  const success = await saveConfig(req.body);
  if (success) res.json({ success: true });
  else res.status(500).json({ error: 'Failed to save config' });
});

export default router;
