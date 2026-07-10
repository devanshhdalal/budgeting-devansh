/** Wrap async route handlers so rejections reach Express error middleware. */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
