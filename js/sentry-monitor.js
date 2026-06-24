/**
 * Sentry Monitoring Setup for Frontend
 * This script initializes Sentry for browser-side error tracking and performance monitoring.
 * It's designed to be loaded before other scripts.
 */
(function() {
    // Sentry DSN will be injected or read from a global config
    // For static HTML, we can use a dedicated endpoint or a global variable
    let SENTRY_DSN = window.SENTRY_DSN || '';
    const ENVIRONMENT = window.NODE_ENV || 'production';

    // Check if DSN is a valid Sentry DSN (should start with https:// and contain @sentry.io or similar)
    // Invalid placeholders like '<!-- SENTRY_DSN_PLACEHOLDER -->' will be filtered out
    const isValidDSN = SENTRY_DSN && 
                       typeof SENTRY_DSN === 'string' && 
                       SENTRY_DSN.startsWith('https://') && 
                       SENTRY_DSN.includes('@');

    if (!isValidDSN) {
        console.log('[Sentry] DSN not configured or invalid placeholder, monitoring disabled');
        return;
    }

    // Load Sentry Browser SDK from CDN if not already present
    if (typeof Sentry === 'undefined') {
        const script = document.createElement('script');
        script.src = "https://browser.sentry-cdn.com/8.0.0/bundle.min.js";
        script.crossOrigin = "anonymous";
        script.onload = initSentry;
        document.head.appendChild(script);
    } else {
        initSentry();
    }

    function initSentry() {
        Sentry.init({
            dsn: SENTRY_DSN,
            environment: ENVIRONMENT,
            integrations: [
                Sentry.browserTracingIntegration(),
                Sentry.replayIntegration(),
            ],
            // Performance Monitoring
            tracesSampleRate: 1.0,
            // Session Replay
            replaysSessionSampleRate: 0.1,
            replaysOnErrorSampleRate: 1.0,
        });
        
        console.log('🚀 Sentry Frontend initialized');
    }
})();
