declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    __GA_DIAGNOSTICS__?: () => void;
    gaDiagnostics?: () => void;
  }
}

let isInitialized = false;
let currentMeasurementId: string | null = null;
let scriptLoadFailed = false;

export const DEFAULT_MEASUREMENT_ID = 'G-9TKT8KQCZE';

export interface TrackedEventLog {
  id: string;
  type: 'page_view' | 'event';
  name: string;
  params?: Record<string, any>;
  timestamp: string;
}

let recentEventsLog: TrackedEventLog[] = [];
const eventListeners: Set<() => void> = new Set();

export const subscribeToEvents = (callback: () => void) => {
  eventListeners.add(callback);
  return () => {
    eventListeners.delete(callback);
  };
};

export const getRecentEvents = (limit: number = 5): TrackedEventLog[] => {
  return recentEventsLog.slice(-limit).reverse();
};

const recordLoggedEvent = (type: 'page_view' | 'event', name: string, params?: Record<string, any>) => {
  const newEntry: TrackedEventLog = {
    id: Math.random().toString(36).substring(2, 9),
    type,
    name,
    params,
    timestamp: new Date().toLocaleTimeString(),
  };
  recentEventsLog.push(newEntry);
  if (recentEventsLog.length > 50) {
    recentEventsLog.shift();
  }
  eventListeners.forEach((listener) => listener());
};

/**
 * Helper to retrieve the current active Measurement ID from env, localStorage, or fallback
 */
export const getActiveMeasurementId = (): string | null => {
  const envId = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID;
  if (envId && envId.trim() !== '') {
    return envId.trim();
  }
  const localId = typeof window !== 'undefined' ? localStorage.getItem('user_ga_measurement_id') : null;
  if (localId && localId.trim() !== '') {
    return localId.trim();
  }
  return DEFAULT_MEASUREMENT_ID;
};

/**
 * Initializes Google Analytics 4 using env var VITE_GA_MEASUREMENT_ID or localStorage override.
 * Ensures any old or duplicate GA scripts are removed before instantiating a single instance.
 */
export const initGA = (customId?: string): void => {
  const measurementId = customId || getActiveMeasurementId();

  if (!measurementId) {
    console.info('[GA4] VITE_GA_MEASUREMENT_ID is not set. Google Analytics tracking is inactive.');
    isInitialized = false;
    currentMeasurementId = null;
    return;
  }

  // Avoid re-initializing if already connected to the same ID
  if (isInitialized && currentMeasurementId === measurementId && typeof window.gtag === 'function') {
    return;
  }

  // 1. Remove any old or existing GA script tags from document to guarantee clean single-instance setup
  const existingScripts = document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]');
  existingScripts.forEach((script) => script.remove());

  scriptLoadFailed = false;

  // 2. Set up window.dataLayer and window.gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer?.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false, // Pageviews are tracked explicitly for SPA route transitions
  });

  // 3. Inject the single official GA4 tag script
  const script = document.createElement('script');
  script.async = true;
  script.id = 'ga4-gtag-script';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  
  script.onerror = () => {
    scriptLoadFailed = true;
    console.warn('[GA4] Failed to load Google Analytics script. An ad-blocker or network restriction may be blocking googletagmanager.com.');
  };

  document.head.appendChild(script);

  isInitialized = true;
  currentMeasurementId = measurementId;
  console.log(`%c[GA4] Initialized single instance with Property ID: ${measurementId}`, 'color: #10b981; font-weight: bold;');

  // Track initial pageview
  trackPageView(window.location.pathname + window.location.search);
};

/**
 * Updates the runtime Measurement ID, saves to localStorage, and re-initializes GA4.
 */
export const setRuntimeMeasurementId = (newId: string): void => {
  const cleanId = newId.trim();
  if (cleanId) {
    localStorage.setItem('user_ga_measurement_id', cleanId);
  } else {
    localStorage.removeItem('user_ga_measurement_id');
  }
  isInitialized = false;
  currentMeasurementId = null;
  initGA();
};

/**
 * Returns detailed status information about GA4 setup.
 */
export const getGAStatus = () => {
  const measurementId = getActiveMeasurementId();
  const envId = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID;
  const localId = typeof window !== 'undefined' ? localStorage.getItem('user_ga_measurement_id') : null;

  return {
    isInitialized: isInitialized && !!currentMeasurementId,
    measurementId: currentMeasurementId || measurementId,
    envId: envId || null,
    localId: localId || null,
    isGtagReady: typeof window !== 'undefined' && typeof window.gtag === 'function',
    scriptLoadFailed,
  };
};

/**
 * Prints a full diagnostic report directly to the browser console.
 */
export const printConsoleDiagnostics = (): void => {
  const status = getGAStatus();
  console.group('%c📊 GOOGLE ANALYTICS 4 (GA4) DIAGNOSTICS REPORT', 'color: #10b981; font-weight: bold; font-size: 13px;');
  console.table({
    'Active Measurement ID': status.measurementId || 'NOT SET ⚠️',
    'Env Var (VITE_GA_MEASUREMENT_ID)': status.envId || 'NOT INJECTED ⚠️',
    'Local Storage Override': status.localId || 'NONE',
    'GA Initialized': status.isInitialized ? 'YES ✅' : 'NO ❌',
    'window.gtag Function Ready': status.isGtagReady ? 'YES ✅' : 'NO ❌',
    'Script Load Status': status.scriptLoadFailed ? 'BLOCKED BY ADBLOCKER 🛑' : 'OK ✅',
  });

  if (!status.measurementId) {
    console.warn('⚠️ VITE_GA_MEASUREMENT_ID is missing. To record analytics, set VITE_GA_MEASUREMENT_ID="G-XXXXXXXXXX" in your environment variables.');
  } else if (status.scriptLoadFailed) {
    console.warn('🛑 Google Analytics script failed to load. Please disable ad-blockers or privacy extensions blocking googletagmanager.com.');
  } else if (status.isInitialized) {
    console.log('✅ Google Analytics is active and sending telemetry. You can test events by running:');
    console.log('   %cwindow.gtag("event", "console_test_event", { test: true })', 'color: #3b82f6; font-weight: bold;');
  }
  console.groupEnd();
};

if (typeof window !== 'undefined') {
  window.__GA_DIAGNOSTICS__ = printConsoleDiagnostics;
  window.gaDiagnostics = printConsoleDiagnostics;
}

/**
 * Tracks a page view event in GA4.
 */
export const trackPageView = (path: string, title?: string): void => {
  const measurementId = currentMeasurementId || getActiveMeasurementId();
  console.log(`[GA4 PageView] path="${path}", title="${title || document.title}" (ID: ${measurementId || 'None'})`);

  recordLoggedEvent('page_view', path, { page_title: title || document.title, send_to: measurementId });

  if (!measurementId || typeof window.gtag !== 'function') return;

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    send_to: measurementId,
  });
};

/**
 * Tracks a custom event in GA4.
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, string | number | boolean | undefined | null>
): void => {
  const measurementId = currentMeasurementId || getActiveMeasurementId();
  console.log(`[GA4 Event] "${eventName}"`, eventParams || {}, `(ID: ${measurementId || 'None'})`);

  recordLoggedEvent('event', eventName, { ...eventParams, send_to: measurementId });

  if (!measurementId || typeof window.gtag !== 'function') return;

  window.gtag('event', eventName, {
    ...eventParams,
    send_to: measurementId,
  });
};

