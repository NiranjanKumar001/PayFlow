/**
 * Centralized error handling middleware.
 * Catches errors thrown by route handlers and sends consistent JSON responses.
 */
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log server errors
  if (status >= 500) {
    console.error(`  ❌ [${req.method}] ${req.path}:`, err.stack);
  }

  res.status(status).json({
    error: message,
    status,
  });
}

/**
 * Wrap async route handlers to automatically catch errors.
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, asyncHandler };
