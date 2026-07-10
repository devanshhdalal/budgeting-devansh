/** True when Cmd (Mac) or Ctrl (Win/Linux) is held. */
export const isModKey = (event) => event.metaKey || event.ctrlKey;

export const modLabel = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    ? '⌘'
    : 'Ctrl';

export const modPlus = (key) => `${modLabel()}+${key}`;
