import { useState, useEffect } from 'react';
import { readChartColors } from '../utils/chartTheme';

/** Reads the --chart-* CSS tokens and re-reads them whenever the theme attribute changes. */
export const useChartColors = () => {
  const [colors, setColors] = useState(readChartColors);

  useEffect(() => {
    const observer = new MutationObserver(() => setColors(readChartColors()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
};
