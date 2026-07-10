const REQUIRED_CONFIG_KEYS = ['CARDS', 'CATEGORIES', 'BUDGET_CONFIG'];

export const validateConfigShape = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Config must be a JSON object';
  }
  for (const key of REQUIRED_CONFIG_KEYS) {
    if (!(key in body)) return `Missing required key: ${key}`;
  }
  if (typeof body.CARDS !== 'object' || Array.isArray(body.CARDS)) {
    return 'CARDS must be an object';
  }
  if (!Array.isArray(body.CATEGORIES)) return 'CATEGORIES must be an array';
  if (typeof body.BUDGET_CONFIG !== 'object' || Array.isArray(body.BUDGET_CONFIG)) {
    return 'BUDGET_CONFIG must be an object';
  }
  if ('SUBSCRIPTIONS' in body && !Array.isArray(body.SUBSCRIPTIONS)) {
    return 'SUBSCRIPTIONS must be an array';
  }
  return null;
};
