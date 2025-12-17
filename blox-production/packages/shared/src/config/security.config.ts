/**
 * Security configuration including CSP headers
 */

export const SecurityConfig = {
  /**
   * Content Security Policy
   * Configure allowed sources for different resource types
   */
  csp: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Vite in dev mode
      "'unsafe-eval'", // Required for some libraries
      'https://js.sentry-cdn.com', // Sentry
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for inline styles
      'https://fonts.googleapis.com',
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'data:',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:', // Allow images from HTTPS sources (adjust as needed)
    ],
    'connect-src': [
      "'self'",
      'https://*.supabase.co', // Supabase
      'https://*.sentry.io', // Sentry
      'https://api.github.com', // If using GitHub API
    ],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': true,
  },

  /**
   * Security headers
   */
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  },

  /**
   * Rate limiting configuration
   */
  rateLimiting: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // per window
  },

  /**
   * Session configuration
   */
  session: {
    timeout: 30 * 60 * 1000, // 30 minutes
    refreshThreshold: 5 * 60 * 1000, // Refresh token 5 minutes before expiry
  },
};

/**
 * Generate CSP header string
 */
export function generateCSPHeader(): string {
  const directives: string[] = [];

  for (const [directive, sources] of Object.entries(SecurityConfig.csp)) {
    if (directive === 'upgrade-insecure-requests' && sources === true) {
      directives.push('upgrade-insecure-requests');
    } else if (Array.isArray(sources)) {
      directives.push(`${directive} ${sources.join(' ')}`);
    }
  }

  return directives.join('; ');
}

