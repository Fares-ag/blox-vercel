/**
 * Web Vitals monitoring
 * Tracks Core Web Vitals and sends to analytics/error tracking
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';
import { loggingService } from '../services/logging.service';

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  entries: PerformanceEntry[];
}

interface WebVitalsReport {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

function sendToAnalytics(metric: WebVitalsMetric) {
  const report: WebVitalsReport = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  };

  // Log to Sentry
  loggingService.addBreadcrumb(
    `Web Vital: ${metric.name}`,
    'performance',
    metric.rating === 'good' ? 'info' : 'warning',
    report
  );

  // Send to analytics (Google Analytics, etc.)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log('Web Vital:', report);
  }
}

/**
 * Initialize Web Vitals tracking
 */
export function initWebVitals() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    onCLS(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
    onINP(sendToAnalytics); // Replaces onFID in web-vitals v5+
  } catch (error) {
    console.error('Failed to initialize Web Vitals:', error);
  }
}

