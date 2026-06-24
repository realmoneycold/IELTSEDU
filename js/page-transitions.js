/**
 * Page Transitions — Smooth navigation between pages
 * Adds a top progress bar and leverages the native View Transitions API
 * for all internal link clicks, providing a perfect SPA feel.
 */
(function () {
  'use strict';

  // ─── Inject View Transitions Meta Tag ───────────────────────
  if (!document.querySelector('meta[name="view-transition"]')) {
    const meta = document.createElement('meta');
    meta.name = 'view-transition';
    meta.content = 'same-origin';
    document.head.appendChild(meta);
  }

  // ─── CSS injection ──────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    /* Top navigation progress bar */
    .nav-progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      z-index: 999999;
      background: linear-gradient(90deg, #8B5CF6, #FF6B35);
      border-radius: 0 2px 2px 0;
      pointer-events: none;
      animation: navProgress 800ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    @keyframes navProgress {
      0%   { width: 0; opacity: 1; }
      80%  { width: 90%; opacity: 1; }
      100% { width: 100%; opacity: 0; }
    }

    /* Dashboard section crossfade */
    .dash-section-enter {
      animation: dashFadeIn 200ms ease-out forwards;
    }
    @keyframes dashFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    
    /* Native View Transitions Customization */
    ::view-transition-old(root),
    ::view-transition-new(root) {
      animation-duration: 0.3s;
    }
  `;
  document.head.appendChild(style);

  // ─── Show progress bar on navigation ──────────────────────
  function showProgressBar() {
    const bar = document.createElement('div');
    bar.className = 'nav-progress-bar';
    document.body.appendChild(bar);
    bar.addEventListener('animationend', function () {
      bar.remove();
    });
  }

  // ─── Check if URL is internal ───────────────────────────────
  function isInternalLink(url) {
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  // ─── Intercept internal link clicks ─────────────────────────
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Skip: hash-only links, mailto, tel, javascript, external, new tab
    if (
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:') ||
      link.target === '_blank' ||
      link.hasAttribute('download') ||
      e.ctrlKey || e.metaKey || e.shiftKey
    ) {
      return;
    }

    // Skip if same page
    const resolved = new URL(href, window.location.origin);
    if (resolved.pathname === window.location.pathname && resolved.hash) {
      return;
    }

    // Only for internal links
    if (!isInternalLink(href)) return;

    // Just show progress bar, the browser handles the crossfade natively
    // via the View Transitions API (same-origin meta tag)
    showProgressBar();
    
    // We do NOT preventDefault here, allowing native navigation to occur
  });

  // ─── Dashboard section crossfade helper ─────────────────────
  window.animateDashSection = function (sectionSelector) {
    const el = document.querySelector(sectionSelector);
    if (!el) return;
    el.classList.remove('dash-section-enter');
    // Force reflow
    void el.offsetWidth;
    el.classList.add('dash-section-enter');
  };
})();
