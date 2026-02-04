# Monitoring & Observability Setup Guide

## 📊 Overview

This guide explains how to set up error tracking, logging, and performance monitoring for the Appminuta application suite.

**Phase 4 - Observability** has been implemented with:
- ✅ Error boundaries in all React applications
- ✅ Centralized structured logging
- ✅ Integration points for external monitoring services
- ✅ Performance tracking hooks

---

## 🛠️ Components Implemented

### 1. Error Boundaries

**Location:**
- `frontend/src/components/ErrorBoundary.tsx`
- `MV/src/components/ErrorBoundary.tsx`
- `uif/src/components/ErrorBoundary.tsx`

**Usage:**
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

**Features:**
- Catches React component errors
- Shows user-friendly error UI
- Logs errors to console (dev) or monitoring service (prod)
- Provides reset functionality

---

### 2. Structured Logger

**Location:**
- `frontend/src/lib/logger.ts`
- `MV/src/lib/logger.ts`
- `uif/src/lib/logger.ts`

**Usage:**
```typescript
import { logger } from '@/lib/logger';

// Log different severity levels
logger.debug('Debug info', { userId: 123 });
logger.info('User logged in', { email: 'user@example.com' });
logger.warn('API rate limit approaching', { usage: 95 });
logger.error('Failed to fetch data', error, { endpoint: '/api/users' });

// Track API calls
logger.apiCall('GET', '/api/projects', 200, 450);

// Track user actions
logger.userAction('Downloaded PDF', { minutaId: '123' });
```

**Features:**
- Consistent log format with timestamps
- Contextual information support
- Integration points for monitoring services
- Development vs production behavior
- API performance tracking
- User action analytics

---

## 🚀 Recommended Monitoring Services

### Option 1: Sentry (Recommended)

**Why Sentry:**
- Excellent React/TypeScript support
- Source map support
- Release tracking
- User context
- Breadcrumbs
- Performance monitoring
- Free tier available

**Setup:**

1. Install Sentry SDK:
```bash
npm install --save @sentry/react @sentry/tracing
```

2. Initialize in each project's `main.tsx`:
```typescript
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.MODE,
  integrations: [new BrowserTracing()],
  tracesSampleRate: 0.1, // Adjust based on traffic
  beforeSend(event) {
    // Don't send errors in development
    if (import.meta.env.DEV) {
      return null;
    }
    return event;
  },
});
```

3. Update logger.ts to send to Sentry:
```typescript
private sendToMonitoring(entry: LogEntry): void {
  if (!this.isDevelopment) {
    Sentry.captureMessage(entry.message, {
      level: entry.level as Sentry.SeverityLevel,
      extra: entry.context,
    });
  }
}
```

4. Wrap ErrorBoundary with Sentry:
```typescript
import * as Sentry from "@sentry/react";

// In App.tsx
<Sentry.ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</Sentry.ErrorBoundary>
```

---

### Option 2: LogRocket

**Why LogRocket:**
- Session replay
- Redux/state tracking
- Console log capture
- Network request monitoring
- User session tracking

**Setup:**

1. Install LogRocket:
```bash
npm install --save logrocket logrocket-react
```

2. Initialize:
```typescript
import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';

if (!import.meta.env.DEV) {
  LogRocket.init('your-app-id/project-name');
  setupLogRocketReact(LogRocket);
}
```

3. Identify users:
```typescript
LogRocket.identify(user.id, {
  name: user.name,
  email: user.email,
});
```

---

### Option 3: Datadog

**Why Datadog:**
- Full-stack monitoring
- APM (Application Performance Monitoring)
- Log aggregation
- Infrastructure monitoring
- Custom metrics

**Setup:**
```bash
npm install --save @datadog/browser-rum
```

```typescript
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
    applicationId: '<DATADOG_APPLICATION_ID>',
    clientToken: '<DATADOG_CLIENT_TOKEN>',
    site: 'datadoghq.com',
    service:'appminuta',
    env: import.meta.env.MODE,
    version: '1.0.0',
    sessionSampleRate: 100,
    sessionReplaySampleRate: 20,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
});
```

---

## 📈 Backend Monitoring (NestJS)

The backend already has:
- ✅ `SecureLoggerService` for structured logging
- ✅ Request/response logging
- ✅ Error logging with context

**Recommended additions:**

1. **Sentry for NestJS:**
```typescript
// main.ts
import * as Sentry from "@sentry/node";
import "@sentry/tracing";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Add Sentry interceptor
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
```

2. **Health checks endpoint:**
```typescript
// health.controller.ts
@Get('health')
checkHealth() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
}
```

---

## 🔍 Performance Monitoring

### Web Vitals (Already Implemented)

All projects have `webVitals.ts` that tracks:
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- FCP (First Contentful Paint)
- TTFB (Time to First Byte)

These metrics are logged in development and should be sent to monitoring service in production.

### API Performance Tracking

The logger has built-in API performance tracking:
```typescript
const startTime = performance.now();
const response = await fetch(url);
const duration = performance.now() - startTime;

logger.apiCall('GET', url, response.status, duration);
```

---

## 🔐 Security & Privacy

### PII Filtering

When logging, avoid sending sensitive data:

```typescript
// ❌ Bad
logger.info('User logged in', { password: user.password });

// ✅ Good
logger.info('User logged in', {
  userId: user.id,
  email: user.email.split('@')[1] // Only domain
});
```

### GDPR Compliance

Before enabling session replay or user tracking:
1. Update privacy policy
2. Add cookie consent banner
3. Implement user data deletion
4. Allow users to opt-out

---

## 📊 Dashboard Setup

### Key Metrics to Track

1. **Error Rate:**
   - Frontend errors per session
   - Backend 5xx errors
   - Failed API calls

2. **Performance:**
   - Page load times
   - API response times
   - Database query times

3. **User Engagement:**
   - Active users
   - Feature usage
   - User flows

4. **Business Metrics:**
   - Minutas created
   - PDF downloads
   - Projects active

---

## 🚨 Alerting Rules

Set up alerts for:
- Error rate > 5% in 5 minutes
- API response time > 3 seconds
- Backend service down
- Database connection failures
- Memory usage > 90%

---

## 📝 Next Steps

1. **Choose a monitoring service** (Sentry recommended)
2. **Create accounts and get credentials**
3. **Install SDKs** in all projects
4. **Update logger.ts** with integration code
5. **Test in staging** environment
6. **Deploy to production**
7. **Set up dashboards** and alerts
8. **Review weekly** for patterns and improvements

---

## 🔗 Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [LogRocket Documentation](https://docs.logrocket.com/)
- [Datadog RUM Documentation](https://docs.datadoghq.com/real_user_monitoring/)
- [Web Vitals](https://web.dev/vitals/)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

---

**Status:** Phase 4 - Observability infrastructure ready for integration ✅
