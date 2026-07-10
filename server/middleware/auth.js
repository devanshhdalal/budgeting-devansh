import { API_KEY } from '../config.js';
import { buildApiKeyMap, DEFAULT_USER_ID, isValidUserId } from '../config/users.js';

const KEY_TO_USER = buildApiKeyMap();

export const requireUser = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  let userId = apiKey ? KEY_TO_USER.get(apiKey) : null;

  if (!userId && API_KEY && apiKey === API_KEY) {
    const headerUser = req.headers['x-budget-user'];
    if (isValidUserId(headerUser)) userId = headerUser;
  }

  if (!userId) {
    const hasKeys = KEY_TO_USER.size > 0 || API_KEY;
    if (!hasKeys) {
      console.warn('Auth bypass: no API keys configured, defaulting to devansh');
      req.userId = DEFAULT_USER_ID;
      return next();
    }
    console.warn('Unauthorized: invalid API key or missing x-budget-user header');
    return res.status(401).json({
      error: 'Unauthorized. Use your personal API key (Shortcut) or select a user on the website.',
      code: 'UNAUTHORIZED',
    });
  }

  req.userId = userId;
  next();
};
