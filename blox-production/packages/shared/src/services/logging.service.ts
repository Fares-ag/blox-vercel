import * as Sentry from '@sentry/react';
import { Config } from '../config/app.config';

// `erasableSyntaxOnly` disallows enums, so use a const object + union type instead.
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

interface LogContext {
  [key: string]: any;
}

class LoggingService {
  private initialized = false;

  private consoleFallback(level: LogLevel, message: string, context?: LogContext) {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message, context);
        break;
      case LogLevel.INFO:
        console.info(message, context);
        break;
      case LogLevel.WARN:
        console.warn(message, context);
        break;
      case LogLevel.ERROR:
        console.error(message, context);
        break;
      default:
        console.log(message, context);
    }
  }

  /**
   * Initialize Sentry with configuration
   */
  init(dsn: string, environment: string, release?: string) {
    if (this.initialized) {
      console.warn('LoggingService already initialized');
      return;
    }

    if (!dsn) {
      console.warn('Sentry DSN not provided, error tracking disabled');
      return;
    }

    Sentry.init({
      dsn,
      environment,
      release,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
      replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event, _hint) {
        // Filter out sensitive data
        if (event.request) {
          delete event.request.cookies;
        }
        return event;
      },
    });

    this.initialized = true;
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: { id: string; email?: string; name?: string; role?: string } | null) {
    if (!this.initialized) return;

    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
        role: user.role,
      });
    } else {
      Sentry.setUser(null);
    }
  }

  /**
   * Set additional context
   */
  setContext(name: string, context: LogContext) {
    if (!this.initialized) return;
    Sentry.setContext(name, context);
  }

  /**
   * Log a message with level
   */
  log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.initialized) {
      // Fallback to console if Sentry not initialized
      this.consoleFallback(level, message, context);
      return;
    }

    switch (level) {
      case LogLevel.DEBUG:
        if (Config.isDevelopment) {
          console.debug(message, context);
        }
        Sentry.addBreadcrumb({
          message,
          level: 'debug',
          data: context,
        });
        break;
      case LogLevel.INFO:
        console.info(message, context);
        Sentry.addBreadcrumb({
          message,
          level: 'info',
          data: context,
        });
        break;
      case LogLevel.WARN:
        console.warn(message, context);
        Sentry.addBreadcrumb({
          message,
          level: 'warning',
          data: context,
        });
        break;
      case LogLevel.ERROR:
        console.error(message, context);
        Sentry.captureMessage(message, {
          level: 'error',
          extra: context,
        });
        break;
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error
   */
  error(error: Error | string, context?: LogContext) {
    if (!this.initialized) {
      console.error(error, context);
      return;
    }

    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: context,
      });
    } else {
      this.log(LogLevel.ERROR, error, context);
    }
  }

  /**
   * Capture exception
   */
  captureException(error: Error, context?: LogContext) {
    if (!this.initialized) {
      console.error(error, context);
      return;
    }

    Sentry.captureException(error, {
      extra: context,
    });
  }

  /**
   * Capture message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: LogContext) {
    if (!this.initialized) {
      if (level === 'warning') {
        console.warn(message, context);
      } else if (level === 'error') {
        console.error(message, context);
      } else {
        console.info(message, context);
      }
      return;
    }

    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  }

  /**
   * Start a transaction for performance monitoring
   */
  startTransaction(name: string, op: string) {
    if (!this.initialized) return null;
    return Sentry.startSpan(
      {
        name,
        op,
      },
      () => {}
    );
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category?: string, level: 'debug' | 'info' | 'warning' | 'error' = 'info', data?: LogContext) {
    if (!this.initialized) {
      if (Config.isDevelopment) {
        console.debug(`[${category || 'breadcrumb'}] ${message}`, data);
      }
      return;
    }

    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
    });
  }
}

export const loggingService = new LoggingService();

