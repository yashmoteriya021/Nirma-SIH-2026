/**
 * Wraps an async route handler to automatically catch rejected promises
 * and forward errors to Express error-handling middleware.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
