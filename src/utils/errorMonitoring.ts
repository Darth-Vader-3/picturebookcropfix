/**
 * Production Crash Reporting & Observability Subsystem.
 * Integrates Sentry SDK with automatic PII/secret key scrubbing, local circular buffers,
 * breadcrumb tracing, and beta telemetry capture.
 */

import * as Sentry from '@sentry/react';

export type AppErrorEvent = {
  id: string;
  timestamp: string;
  category: 'security' | 'database' | 'network' | 'ui' | 'auth' | 'ota' | 'killswitch';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  stack?: string;
  context?: Record<string, any>;
  url: string;
  userAgent: string;
  handled?: boolean;
  level?: string;
  release?: string;
};

export type CrashReport = AppErrorEvent;

export interface Breadcrumb {
  timestamp: string;
  category: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

class ErrorMonitoringService {
  private errorLog: AppErrorEvent[] = [];
  private breadcrumbs: Breadcrumb[] = [];
  private maxStoredErrors = 100;
  private maxStoredBreadcrumbs = 50;
  private isSentryInitialized = false;
  private dsn: string = '';

  constructor() {
    this.initSentry();
    this.setupGlobalHandlers();
  }

  /**
   * Initializes Sentry SDK with strict PII filtering and privacy boundaries.
   */
  private initSentry() {
    try {
      const envDsn = 
        (typeof import.meta !== 'undefined' && ((import.meta as any).env?.VITE_SENTRY_DSN || (import.meta as any).env?.VITE_ERROR_MONITORING_DSN)) || '';
      
      this.dsn = envDsn;

      if (this.dsn && this.dsn.startsWith('http')) {
        Sentry.init({
          dsn: this.dsn,
          environment: (import.meta as any).env?.VITE_APP_ENV || 'production',
          release: `digipicture@${(import.meta as any).env?.VITE_APP_VERSION || '1.2.0'}`,
          sampleRate: 1.0,
          beforeSend: (event) => {
            // Strip any accidental sensitive tokens or credentials before transmission
            if (event.request?.headers) {
              delete event.request.headers['Authorization'];
              delete event.request.headers['Cookie'];
            }
            if (event.user) {
              // Strip direct email/IP to protect user privacy (COPPA / GDPR)
              delete event.user.ip_address;
              if (event.user.email) {
                event.user.email = this.maskEmail(event.user.email);
              }
            }
            // Sanitize breadcrumb and message contents
            if (event.message) {
              event.message = this.sanitizeErrorMessage(event.message);
            }
            return event;
          },
          beforeBreadcrumb: (breadcrumb) => {
            if (breadcrumb.data) {
              breadcrumb.data = this.sanitizeContext(breadcrumb.data);
            }
            return breadcrumb;
          }
        });
        this.isSentryInitialized = true;
        console.log('[Observability] Sentry crash reporting initialized successfully.');
      } else {
        console.log('[Observability] Local in-memory crash logger initialized (DSN optional).');
      }
    } catch (err) {
      console.warn('[Observability] Failed to initialize Sentry:', err);
    }
  }

  private setupGlobalHandlers() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.captureException(event.error || event.message, {
        category: 'ui',
        severity: 'error',
        context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
        handled: false
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.captureException(event.reason, {
        category: 'network',
        severity: 'error',
        context: { type: 'unhandled_promise_rejection' },
        handled: false
      });
    });
  }

  /**
   * Records a user or system breadcrumb for root-cause diagnosis
   */
  public addBreadcrumb(category: string, message: string, data?: Record<string, any>, level: 'info' | 'warning' | 'error' = 'info') {
    const breadcrumb: Breadcrumb = {
      timestamp: new Date().toISOString(),
      category,
      message: this.sanitizeErrorMessage(message),
      level,
      data: data ? this.sanitizeContext(data) : undefined
    };

    this.breadcrumbs.unshift(breadcrumb);
    if (this.breadcrumbs.length > this.maxStoredBreadcrumbs) {
      this.breadcrumbs.pop();
    }

    if (this.isSentryInitialized) {
      Sentry.addBreadcrumb({
        category,
        message: breadcrumb.message,
        level: level === 'error' ? 'error' : level === 'warning' ? 'warning' : 'info',
        data: breadcrumb.data
      });
    }
  }

  /**
   * Captures an exception, sanitizes it, and logs to Sentry + Local storage
   */
  public captureException(
    error: unknown,
    options: {
      category?: 'security' | 'database' | 'network' | 'ui' | 'auth' | 'ota' | 'killswitch';
      severity?: 'info' | 'warning' | 'error' | 'critical';
      context?: Record<string, any>;
      handled?: boolean;
    } = {}
  ): AppErrorEvent {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const cleanMessage = this.sanitizeErrorMessage(rawMessage);

    const event: AppErrorEvent = {
      id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      category: options.category || 'ui',
      severity: options.severity || 'error',
      message: cleanMessage,
      stack: error instanceof Error ? this.sanitizeStack(error.stack) : undefined,
      context: this.sanitizeContext(options.context || {}),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      handled: options.handled !== false
    };

    this.errorLog.unshift(event);
    if (this.errorLog.length > this.maxStoredErrors) {
      this.errorLog.pop();
    }

    // Console logging with distinct badges
    if (event.severity === 'critical' || event.category === 'security') {
      console.warn(`🚨 [Security Alert] [${event.category.toUpperCase()}] ${event.message}`, event.context);
    } else {
      console.error(`💥 [Error Monitor] [${event.category}] ${event.message}`);
    }

    // Transmit to Sentry if available
    if (this.isSentryInitialized) {
      Sentry.withScope((scope) => {
        scope.setTag('category', event.category);
        scope.setTag('severity', event.severity);
        scope.setExtra('handled', event.handled);
        if (event.context) {
          scope.setExtras(event.context);
        }
        if (error instanceof Error) {
          Sentry.captureException(error);
        } else {
          Sentry.captureMessage(cleanMessage, event.severity === 'critical' ? 'fatal' : 'error');
        }
      });
    }

    // Direct HTTP DSN fallback dispatch
    if (this.dsn && !this.isSentryInitialized) {
      this.dispatchToRemote(event);
    }

    return event;
  }

  public captureSecurityEvent(message: string, context?: Record<string, any>) {
    return this.captureException(message, {
      category: 'security',
      severity: 'critical',
      context,
      handled: true
    });
  }

  public captureApiFailure(endpoint: string, status: number, statusText: string, context?: Record<string, any>) {
    return this.captureException(`API Failure: ${endpoint} returned ${status} ${statusText}`, {
      category: 'network',
      severity: status >= 500 ? 'critical' : 'error',
      context: { endpoint, status, statusText, ...context },
      handled: true
    });
  }

  public getRecentErrors(): AppErrorEvent[] {
    return [...this.errorLog];
  }

  public getCrashLogs(): CrashReport[] {
    return this.getRecentErrors().map((e) => ({
      ...e,
      level: e.severity,
      release: (import.meta as any).env?.VITE_APP_VERSION || '1.3.0'
    }));
  }

  public getRecentBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  public clearErrors(): void {
    this.errorLog = [];
    this.breadcrumbs = [];
  }

  public clearLogs(): void {
    this.clearErrors();
  }

  public exportDiagnosticBundle(): string {
    const diagnostic = {
      generatedAt: new Date().toISOString(),
      appVersion: (import.meta as any).env?.VITE_APP_VERSION || '1.2.0',
      environment: (import.meta as any).env?.VITE_APP_ENV || 'production',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      recentErrors: this.errorLog.slice(0, 20),
      recentBreadcrumbs: this.breadcrumbs.slice(0, 30)
    };
    return safeJsonStringify(diagnostic, 2);
  }

  public maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***@***.com';
    const [name, domain] = email.split('@');
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : '***';
    return `${maskedName}@${domain}`;
  }

  public sanitizeErrorMessage(msg: string): string {
    if (!msg) return '';
    return msg
      .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]')
      .replace(/(password|secret|token|apiKey|auth_key|pwd)=([^&\s]+)/gi, '$1=[REDACTED]')
      .replace(/bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (match) => this.maskEmail(match))
      .slice(0, 800);
  }

  private sanitizeStack(stack?: string): string | undefined {
    if (!stack) return undefined;
    return this.sanitizeErrorMessage(stack).slice(0, 2500);
  }

  public sanitizeContext(context: Record<string, any>): Record<string, any> {
    if (!context || typeof context !== 'object') {
      return {};
    }
    const seen = new WeakSet();

    const sanitizeVal = (val: any, depth = 0): any => {
      if (depth > 6) return '[Truncated: Max Depth]';
      if (val === null || val === undefined) return val;

      if (typeof val === 'string') {
        if (val.includes('@')) return this.maskEmail(val);
        return this.sanitizeErrorMessage(val);
      }
      if (typeof val === 'number' || typeof val === 'boolean') {
        return val;
      }
      if (typeof val === 'function') {
        return `[Function: ${val.name || 'anonymous'}]`;
      }
      if (typeof val === 'symbol') {
        return val.toString();
      }

      // Detect DOM elements & nodes (such as HTMLImageElement)
      if (typeof (val as any).nodeType === 'number' || (typeof window !== 'undefined' && val instanceof Node)) {
        return `[DOMNode: ${(val as any).nodeName || 'Element'}]`;
      }

      // Detect React Synthetic Events
      if ('_reactName' in val || 'nativeEvent' in val) {
        return `[ReactSyntheticEvent: ${(val as any).type || (val as any)._reactName || 'Event'}]`;
      }

      // Detect React Element / Fiber objects
      if (val.$$typeof && typeof val.$$typeof === 'symbol') {
        return '[ReactElement]';
      }

      if (typeof val === 'object') {
        // Prevent circular reference crash
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);

        if (Array.isArray(val)) {
          return val.slice(0, 50).map(item => sanitizeVal(item, depth + 1));
        }

        const res: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
          // Omit React internal fields
          if (k.startsWith('__reactFiber') || k.startsWith('__reactEvents') || k.startsWith('__reactContainer')) {
            continue;
          }
          if (/(password|secret|token|key|hash|credential|auth)/i.test(k)) {
            res[k] = '[REDACTED]';
          } else {
            res[k] = sanitizeVal(v, depth + 1);
          }
        }
        return res;
      }

      return String(val);
    };

    try {
      return sanitizeVal(context, 0);
    } catch {
      return { error: '[Sanitization Fallback]' };
    }
  }

  private async dispatchToRemote(event: AppErrorEvent): Promise<void> {
    try {
      if (!this.dsn.startsWith('http')) return;
      await fetch(this.dsn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify(event),
        keepalive: true
      });
    } catch {
      // Fail silently to prevent recursive crash
    }
  }
}

/**
 * Universal circular-reference safe JSON stringification utility.
 * Prevents "TypeError: Converting circular structure to JSON" across DOM, React, and error monitoring objects.
 */
export function safeJsonStringify(value: any, indent?: number): string {
  const seen = new WeakSet();
  try {
    return JSON.stringify(
      value,
      (key, val) => {
        if (typeof val === 'object' && val !== null) {
          if (typeof (val as any).nodeType === 'number' || (typeof window !== 'undefined' && val instanceof Node)) {
            return `[DOMNode: ${(val as any).nodeName || 'Element'}]`;
          }
          if ('_reactName' in val || 'nativeEvent' in val) {
            return `[ReactSyntheticEvent: ${(val as any).type || (val as any)._reactName || 'Event'}]`;
          }
          if (key && (key.startsWith('__reactFiber') || key.startsWith('__reactEvents') || key.startsWith('__reactContainer'))) {
            return undefined;
          }
          if (val.$$typeof && typeof val.$$typeof === 'symbol') {
            return '[ReactElement]';
          }
          if (seen.has(val)) {
            return '[Circular]';
          }
          seen.add(val);
        }
        return val;
      },
      indent
    );
  } catch {
    return 'null';
  }
}

export const errorMonitor = new ErrorMonitoringService();
