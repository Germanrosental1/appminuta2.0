/**
 * ⚡ MONITORING: Web Vitals tracking for Core Web Vitals metrics
 *
 * Tracks LCP (Largest Contentful Paint), FID (First Input Delay), and CLS (Cumulative Layout Shift)
 * These are Google's Core Web Vitals for measuring user experience.
 */

interface WebVitalsMetric {
    name: 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB';
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
}

type WebVitalsCallback = (metric: WebVitalsMetric) => void;

// Thresholds based on Google's Core Web Vitals recommendations
const thresholds = {
    LCP: { good: 2500, poor: 4000 },      // Largest Contentful Paint (ms)
    FID: { good: 100, poor: 300 },        // First Input Delay (ms)
    CLS: { good: 0.1, poor: 0.25 },       // Cumulative Layout Shift (score)
    FCP: { good: 1800, poor: 3000 },      // First Contentful Paint (ms)
    TTFB: { good: 800, poor: 1800 },      // Time to First Byte (ms)
};

function getRating(name: keyof typeof thresholds, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = thresholds[name];
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
}

let callback: WebVitalsCallback | null = null;

/**
 * Initialize Web Vitals tracking
 * @param onMetric Callback function to receive metrics
 */
export function initWebVitals(onMetric?: WebVitalsCallback): void {
    if (globalThis.window === undefined) return;

    callback = onMetric || defaultCallback;

    // Track LCP (Largest Contentful Paint)
    trackLCP();

    // Track FID (First Input Delay)
    trackFID();

    // Track CLS (Cumulative Layout Shift)
    trackCLS();

    // Track FCP (First Contentful Paint)
    trackFCP();

    // Track TTFB (Time to First Byte)
    trackTTFB();
}

function trackLCP(): void {
    if (!('PerformanceObserver' in globalThis)) return;

    try {
        const observer = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries.at(-1) as PerformanceEntry & { startTime: number };

            if (lastEntry && callback) {
                const value = lastEntry.startTime;
                callback({
                    name: 'LCP',
                    value,
                    rating: getRating('LCP', value),
                    timestamp: Date.now(),
                });
            }
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
        // Browser doesn't support this metric
    }
}

function trackFID(): void {
    if (!('PerformanceObserver' in globalThis)) return;

    try {
        const observer = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const firstEntry = entries[0] as PerformanceEntry & { processingStart: number; startTime: number };

            if (firstEntry && callback) {
                const value = firstEntry.processingStart - firstEntry.startTime;
                callback({
                    name: 'FID',
                    value,
                    rating: getRating('FID', value),
                    timestamp: Date.now(),
                });
            }
        });
        observer.observe({ type: 'first-input', buffered: true });
    } catch {
        // Browser doesn't support this metric
    }
}

function trackCLS(): void {
    if (!('PerformanceObserver' in globalThis)) return;

    let clsValue = 0;

    try {
        const observer = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                const layoutShift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
                if (!layoutShift.hadRecentInput) {
                    clsValue += layoutShift.value;
                }
            }

            if (callback) {
                callback({
                    name: 'CLS',
                    value: clsValue,
                    rating: getRating('CLS', clsValue),
                    timestamp: Date.now(),
                });
            }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
    } catch {
        // Browser doesn't support this metric
    }
}

function trackFCP(): void {
    if (!('PerformanceObserver' in globalThis)) return;

    try {
        const observer = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntriesByName('first-contentful-paint');
            const fcpEntry = entries[0];

            if (fcpEntry && callback) {
                const value = fcpEntry.startTime;
                callback({
                    name: 'FCP',
                    value,
                    rating: getRating('FCP', value),
                    timestamp: Date.now(),
                });
            }
        });
        observer.observe({ type: 'paint', buffered: true });
    } catch {
        // Browser doesn't support this metric
    }
}

function trackTTFB(): void {
    if (globalThis.window === undefined || !globalThis.performance) return;

    // Wait for navigation timing to be available
    setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (navigation && callback) {
            const value = navigation.responseStart - navigation.requestStart;
            callback({
                name: 'TTFB',
                value,
                rating: getRating('TTFB', value),
                timestamp: Date.now(),
            });
        }
    }, 0);
}

function defaultCallback(metric: WebVitalsMetric): void {
    // In development, log to console
    if (import.meta.env.DEV) {
        const color = metric.rating === 'good' ? 'green' : metric.rating === 'needs-improvement' ? 'orange' : 'red';
        console.log(
            `%c[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`,
            `color: ${color}; font-weight: bold;`
        );
    }

    // In production, you could send to analytics here
    // Example: sendToAnalytics(metric);
}

/**
 * Get current metrics summary
 */
export function getWebVitalsThresholds(): typeof thresholds {
    return thresholds;
}
