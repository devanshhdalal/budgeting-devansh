import { API_KEY } from '../config.js';

export const requireApiKey = (req, res, next) => {
  if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
    console.warn(`Unauthorized request blocked. Key provided: ${req.headers['x-api-key'] ? 'Yes' : 'No'}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
