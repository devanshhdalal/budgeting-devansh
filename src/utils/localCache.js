export const readCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn(`Corrupt cache for ${key}`, e);
    return null;
  }
};

export const writeCache = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (e) {
    console.warn(`Failed to write cache for ${key}`, e);
    return { ok: false, error: e?.message ?? 'Cache write failed' };
  }
};
