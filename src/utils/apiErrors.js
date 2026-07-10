export const getErrorCopy = ({ status, code, error }) => {
  if (code === 'TIMEOUT' || code === 'NETWORK' || status === 0) {
    return error || 'Could not reach the server. Check your connection and try again.';
  }
  if (status === 401 || code === 'UNAUTHORIZED') {
    return error || 'Unauthorized. Check your API key or profile selection.';
  }
  if (status === 503 || code === 'STORAGE') {
    return error || 'Storage is temporarily unavailable. Try again in a moment.';
  }
  if (status === 404 || code === 'NOT_FOUND') {
    return error || 'The requested resource was not found.';
  }
  if (status === 400 || code === 'VALIDATION') {
    return error || 'Please check your input and try again.';
  }
  return error || 'Something went wrong. Please try again.';
};

export const getPageErrorVariant = (status) => (status === 0 ? 'network' : 'error');

export const getPageErrorTitle = (status) => {
  if (status === 0) return "Can't reach the server";
  if (status === 404) return 'Not found';
  if (status === 503) return 'Data unavailable';
  return 'Something went wrong';
};
