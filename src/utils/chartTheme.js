/** Palette mirrors :root --chart-* tokens in index.css */
export const CHART_COLOR_VARS = [
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--chart-6',
];

export const FALLBACK_CHART_COLORS = [
  '#c45c4a',
  '#8b6fd4',
  '#0d9b6e',
  '#3b82f6',
  '#d4922a',
  '#64748b',
];

export const readChartColors = () => {
  if (typeof document === 'undefined') return [...FALLBACK_CHART_COLORS];
  const styles = getComputedStyle(document.documentElement);
  return CHART_COLOR_VARS.map((name, i) => {
    const value = styles.getPropertyValue(name).trim();
    return value || FALLBACK_CHART_COLORS[i];
  });
};

export const getCategoryColorIndex = (categoryName, categories = []) => {
  const idx = categories.findIndex((c) => c.value === categoryName);
  return idx >= 0 ? idx : categories.length;
};

export const getCategoryColor = (categoryName, categories, colors) => {
  const index = getCategoryColorIndex(categoryName, categories);
  return colors[index % colors.length];
};

export const formatPercent = (value, total) => {
  if (!total || total <= 0) return 0;
  return Math.round((value / total) * 100);
};

/** Compact axis labels, e.g. $1.2k */
export const formatAxisCurrency = (value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return '$0';
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
};
