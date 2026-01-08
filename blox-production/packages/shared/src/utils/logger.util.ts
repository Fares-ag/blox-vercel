import { Config } from '../config/app.config';
import { loggingService } from '../services/logging.service';

/**
 * Development-only logger utility
 * In production, these calls use the logging service (Sentry) if configured
 */
export const devLogger = {
  /**
   * Debug logging - only in development
   */
  debug: (message: string, ...args: unknown[]): void => {
    if (Config.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
    // In production, debug logs are typically not sent to Sentry
  },

  /**
   * Info logging
   */
  info: (message: string, ...args: unknown[]): void => {
    if (Config.isDevelopment) {
      console.info(`[INFO] ${message}`, ...args);
    } else {
      loggingService.log('info', message, { args });
    }
  },

  /**
   * Warning logging
   */
  warn: (message: string, ...args: unknown[]): void => {
    if (Config.isDevelopment) {
      console.warn(`[WARN] ${message}`, ...args);
    } else {
      loggingService.warn(message, { args });
    }
  },

  /**
   * Error logging - always logs, but uses logging service in production
   */
  error: (message: string, error?: unknown, ...args: unknown[]): void => {
    if (Config.isDevelopment) {
      console.error(`[ERROR] ${message}`, error, ...args);
    } else {
      if (error instanceof Error) {
        loggingService.error(error, { message, args });
      } else {
        loggingService.error(new Error(message), { error, args });
      }
    }
  },

  /**
   * Log with emoji prefix (for visual debugging in dev only)
   */
  debugWithEmoji: (emoji: string, message: string, ...args: unknown[]): void => {
    if (Config.isDevelopment) {
      console.debug(`${emoji} ${message}`, ...args);
    }
  },
};

