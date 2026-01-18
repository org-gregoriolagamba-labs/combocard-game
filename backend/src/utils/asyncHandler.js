/**
 * Async Handler Utility
 * 
 * Wraps async route handlers to catch errors and pass them to error middleware.
 */

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
