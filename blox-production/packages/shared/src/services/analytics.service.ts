/**
 * Analytics service for tracking user actions and events
 */

import { loggingService } from './logging.service';

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

class AnalyticsService {
  private initialized = false;

  /**
   * Initialize analytics (Google Analytics, etc.)
   */
  init(trackingId?: string) {
    if (this.initialized || !trackingId) {
      return;
    }

    // Initialize Google Analytics if tracking ID is provided
    if (trackingId && typeof window !== 'undefined') {
      // Load gtag script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
      document.head.appendChild(script);

      // Initialize gtag
      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(...args: any[]) {
        (window as any).dataLayer.push(args);
      }
      (window as any).gtag = gtag;

      gtag('js', new Date());
      gtag('config', trackingId, {
        page_path: window.location.pathname,
      });

      this.initialized = true;
    }
  }

  /**
   * Track page view
   */
  trackPageView(path: string, title?: string) {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', import.meta.env.VITE_GA_TRACKING_ID, {
        page_path: path,
        page_title: title,
      });
    }
  }

  /**
   * Track event
   */
  trackEvent(event: AnalyticsEvent) {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
      });
    }

    // Also log to Sentry as breadcrumb
    if (typeof window !== 'undefined') {
      loggingService.addBreadcrumb(
        `${event.category}: ${event.action}`,
        'analytics',
        'info',
        event
      );
    }
  }

  /**
   * Track user action
   */
  trackUserAction(action: string, details?: Record<string, any>) {
    this.trackEvent({
      action,
      category: 'user_action',
      label: JSON.stringify(details),
    });
  }

  /**
   * Track conversion
   */
  trackConversion(conversionName: string, value?: number) {
    this.trackEvent({
      action: conversionName,
      category: 'conversion',
      value,
    });
  }
}

export const analyticsService = new AnalyticsService();

