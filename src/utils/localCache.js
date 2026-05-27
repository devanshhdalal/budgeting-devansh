export const readCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const writeCache = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};
