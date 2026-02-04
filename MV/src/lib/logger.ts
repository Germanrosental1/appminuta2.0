/**
 * Centralized Structured Logger
 * Phase 4 - Observability
 *
 * Provides structured logging with consistent format, severity levels,
 * and integration points for external monitoring services.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  stack?: string;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
  }

  /**
   * Format log entry with consistent structure
   */
  private formatLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
    };
  }

  /**
   * Send log to external monitoring service
   * TODO: Integrate with Sentry, LogRocket, or similar
   */
  private sendToMonitoring(entry: LogEntry): void {
    // In production, send to monitoring service
    if (!this.isDevelopment) {
      // Example: Sentry.captureMessage(entry.message, entry.level);
      // Example: LogRocket.track(entry.level, entry);
    }
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return;

    const entry = this.formatLogEntry('debug', message, context);
    console.log(`[DEBUG] ${message}`, context || '');
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext): void {
    const entry = this.formatLogEntry('info', message, context);

    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, context || '');
    }

    this.sendToMonitoring(entry);
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    const entry = this.formatLogEntry('warn', message, context);

    console.warn(`[WARN] ${message}`, context || '');
    this.sendToMonitoring(entry);
  }

  /**
   * Log error messages
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const entry = this.formatLogEntry('error', message, {
      ...context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    });

    console.error(`[ERROR] ${message}`, error || '', context || '');
    this.sendToMonitoring(entry);
  }

  /**
   * Log API request/response for debugging
   */
  apiCall(
    method: string,
    url: string,
    status: number,
    duration: number,
    context?: LogContext
  ): void {
    const entry = this.formatLogEntry('info', 'API Call', {
      method,
      url,
      status,
      duration,
      ...context,
    });

    if (this.isDevelopment) {
      console.log(
        `[API] ${method} ${url} - ${status} (${duration}ms)`,
        context || ''
      );
    }

    // Track slow API calls
    if (duration > 3000) {
      this.warn('Slow API call detected', { method, url, duration });
    }

    this.sendToMonitoring(entry);
  }

  /**
   * Log user action for analytics
   */
  userAction(action: string, context?: LogContext): void {
    const entry = this.formatLogEntry('info', `User Action: ${action}`, context);

    if (this.isDevelopment) {
      console.log(`[USER ACTION] ${action}`, context || '');
    }

    this.sendToMonitoring(entry);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for external use
export type { LogLevel, LogContext, LogEntry };
