/**
 * Global Navigation - auth-aware nav for all HTML pages
 * - Logo links to index.html
 * - Sign In → login.html, Sign Up → signup.html
 * - When logged in: hide Login/Signup, show Dashboard + Logout
 */
(function () {
  'use strict';

  function getToken() {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  }

  function getRole() {
    return (localStorage.getItem('role') || '').toLowerCase();
  }

  function getDashboardUrl() {
    const role = getRole();
    switch (role) {
      case 'ceo': return 'ceo.html';
      case 'admin': return 'admin.html';
      case 'centre': return 'education-centre.html';
      default: return 'dashboard.html';
    }
  }

  function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('userState');
    window.location.href = 'index.html';
  }

  function resolvePath(base, href) {
    if (!href || href.startsWith('http') || href.startsWith('//')) return href;
    if (href.startsWith('/')) return href;
    const dir = (base || '').replace(/\/[^/]*$/, '/');
    return (dir + href).replace(/\/+/g, '/');
  }

  function getBasePath() {
    const path = window.location.pathname || '';
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    return parts.length ? '/' + parts.join('/') + '/' : '/';
  }

  function init() {
    const base = getBasePath();
    const token = getToken();
    const isLoggedIn = !!token;
    const loginPath = base === '/' ? 'login.html' : '../login.html';
    const signupPath = base === '/' ? 'login/signup.html' : '../login/signup.html';
    const indexPath = base === '/' ? 'index.html' : '../index.html';

    // 1. Logo → index.html
    const logoSelectors = [
      '[data-nav="logo"]',
      '.home-e-264',
      '.home-e-266',
      '.hdr-logo',
      '.sidebar-logo a',
      '.logo-badge',
      '.brand',
      'a.brand',
      '.site-header .logo',
      '.header-nav a[href*="index"]',
    ];
    for (const sel of logoSelectors) {
      const el = document.querySelector(sel);
      if (el && !el.href) {
        const link = el.tagName === 'A' ? el : el.closest('a') || el.querySelector('a');
        if (link) {
          link.href = resolvePath(base, indexPath);
        } else if (el.tagName !== 'A') {
          el.style.cursor = 'pointer';
          el.addEventListener('click', function (e) {
            if (!e.target.closest('a')) {
              window.location.href = resolvePath(base, indexPath);
            }
          });
        }
      }
    }
    const logoImg = document.querySelector('.home-e-264 img, .home-e-265 img');
    if (logoImg) {
      const parent = logoImg.closest('.home-e-264') || logoImg.closest('.home-e-265');
      if (parent && !parent.querySelector('a[href]')) {
        const wrap = document.createElement('a');
        wrap.href = resolvePath(base, indexPath);
        wrap.className = 'logo-link';
        parent.insertBefore(wrap, parent.firstChild);
        wrap.appendChild(logoImg.parentElement || logoImg);
      }
    }

    // 2. Auth buttons container - look for Get Started or add nav-auth
    const authContainer = document.getElementById('nav-auth-buttons') ||
      document.querySelector('[data-nav="auth"]') ||
      document.querySelector('.home-e-263') ||
      document.querySelector('.hdr-right');
    if (authContainer) {
      const signInPath = resolvePath(base, loginPath);
      const signUpPath = resolvePath(base, signupPath);
      if (isLoggedIn) {
        const dashUrl = base === '/' ? getDashboardUrl() : '../' + getDashboardUrl();
      authContainer.innerHTML = `
          <a class="btn btn-dashboard" href="${resolvePath(base, dashUrl)}" style="margin-right:8px">Dashboard</a>
          <button type="button" class="btn btn-logout" id="global-logout-btn">Logout</button>
        `;
        const logoutBtn = document.getElementById('global-logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', logout);
      } else {
        authContainer.innerHTML = `
          <a href="${signInPath}" class="nav-signin" style="margin-right:8px">Sign In</a>
          <a href="${signUpPath}" class="nav-signup">Sign Up</a>
        `;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
