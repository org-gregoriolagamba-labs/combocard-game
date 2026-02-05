/**
 * CORS Origin Handler
 *
 * Builds a CORS origin handler that supports exact string matching
 * and wildcard patterns (e.g. http://192.168.1.*:3000).
 *
 * Wildcard patterns use * to match any sequence of characters.
 * For example, http://192.168.1.*:3000 will match
 *   http://192.168.1.42:3000, http://192.168.1.100:3000, etc.
 */

/**
 * Convert a wildcard pattern string into a RegExp.
 * All regex-special characters are escaped, and * becomes .*
 *
 * @param {string} pattern – e.g. "http://192.168.1.*:3000"
 * @returns {RegExp}
 */
export function wildcardToRegex(pattern) {
  const placeholder = "___WILDCARD___";
  const withPlaceholder = pattern.replaceAll("*", placeholder);
  const escaped = withPlaceholder.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const regexStr = escaped.replaceAll(placeholder, ".*");
  return new RegExp(`^${regexStr}$`);
}

/**
 * Build a CORS origin handler function compatible with the `cors` package
 * and Socket.IO cors option.
 *
 * @param {string} corsOriginConfig – comma-separated origins, or "*" for allow-all
 * @returns {(origin: string|undefined, callback: Function) => void}
 */
export function buildCorsOriginHandler(corsOriginConfig) {
  if (corsOriginConfig === "*") {
    return (origin, callback) => callback(null, true);
  }

  const allowedOrigins = String(corsOriginConfig)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const originMatchers = allowedOrigins.map((pattern) =>
    pattern.includes("*") ? wildcardToRegex(pattern) : pattern,
  );

  return (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    const isAllowed = originMatchers.some((matcher) =>
      matcher instanceof RegExp ? matcher.test(origin) : matcher === origin,
    );

    if (isAllowed) {
      return callback(null, true);
    }

    console.warn(`CORS blocked for origin: ${origin}`);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  };
}
