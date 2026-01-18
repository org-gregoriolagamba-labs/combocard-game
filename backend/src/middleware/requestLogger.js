/**
 * Request Logger Middleware
 * 
 * Logs incoming requests with useful information for debugging.
 */

/**
 * Log request details
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log after response is sent
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? "warn" : "log";
    
    console[logLevel](
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
  });
  
  next();
};
