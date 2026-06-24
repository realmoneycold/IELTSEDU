/**
 * IELTSPRACTICE Auth Guard & API Interceptor
 * - Protects dashboard, ceo, education-centre pages
 * - Provides apiFetch() with automatic Authorization header and 401 handling
 * - Validates JWT tokens and enforces role-based access
 */
(function () {
  'use strict';

  function decodeJWT(token) {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (e) {
      return null;
    }
  }

  function isTokenExpired(token) {
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  }

  function validateTokenAndRole(token, requiredRole) {
    if (!token) return { valid: false, reason: 'No token found' };
    
    if (isTokenExpired(token)) return { valid: false, reason: 'Token expired' };
    
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.role) return { valid: false, reason: 'Invalid token' };
    
    const userRole = decoded.role.toLowerCase();
    if (requiredRole && userRole !== requiredRole.toLowerCase()) {
      return { valid: false, reason: `Access denied. Required: ${requiredRole}, Found: ${decoded.role}` };
    }
    
    return { valid: true, decoded, role: userRole };
  }

  function readUserState() {
    const token =
      localStorage.getItem('authToken') ||
      localStorage.getItem('token') ||
      null;
    let role = (localStorage.getItem('role') || '').trim() || null;
    try {
      const rawState = localStorage.getItem('userState');
      const parsedState = rawState ? JSON.parse(rawState) : null;
      if (!token && parsedState && parsedState.token) {
        localStorage.setItem('authToken', parsedState.token);
      }
      if (!role && parsedState && parsedState.role) role = parsedState.role;
    } catch (_) {}
    try {
      const rawUser = localStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      if (!role && user && (user.role || user.type)) role = user.role || user.type;
    } catch (_) {}
    return {
      token: token || localStorage.getItem('authToken') || null,
      role: (role || '').toLowerCase() || 'student',
    };
  }

  function fileName() {
    let path = window.location.pathname || '';
    if (path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    let name = path.split('/').pop() || 'index.html';
    if (name && !name.includes('.') && name !== '') {
      name = name + '.html';
    }
    return name;
  }

  function clearAuthAndRedirect() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('userState');
    window.location.replace('/login.html');
  }

  function redirect(to) {
    if (fileName().toLowerCase() === to.toLowerCase()) return;
    window.location.replace(to);
  }

  // ─── Inactivity Timeout Handling ──────────────────────────────
  const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
  function updateLastActivity() {
    if (localStorage.getItem('token') || localStorage.getItem('authToken')) {
      localStorage.setItem('lastActivity', Date.now().toString());
    }
  }

  function checkInactivity() {
    const lastActivity = localStorage.getItem('lastActivity');
    const hasToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    
    if (hasToken && lastActivity) {
      const inactiveTime = Date.now() - parseInt(lastActivity, 10);
      if (inactiveTime > INACTIVITY_LIMIT) {
        console.warn('Session expired due to inactivity (30m). Redirecting to login...');
        clearAuthAndRedirect();
        return true;
      }
    }
    return false;
  }

  // Setup activity listeners
  ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, updateLastActivity, { passive: true });
  });
  
  // Initial activity update
  updateLastActivity();

  // Helper to sanitize HTML to prevent XSS (client-side safety)
  window.sanitizeHTML = function(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  };

  // Periodic check
  setInterval(checkInactivity, 60000); // Check every minute

  function routeByRole(role) {
    switch ((role || '').toLowerCase()) {
      case 'ceo':
        return '/portalceo.html';
      case 'admin':
        return '/admin/admin.html';
      case 'centre':
        return 'education-centre.html';
      default:
        return '/dashboard.html';
    }
  }

  /**
   * Global apiFetch - attaches Bearer token, handles 401, and implements retry logic
   * @param {string} endpoint - e.g. '/api/user/profile'
   * @param {RequestInit} options - fetch options (method, body, headers, etc.)
   * @param {number} retries - number of retries for failed calls (default: 2)
   * @returns {Promise<Response>}
   */
  window.apiFetch = function apiFetch(endpoint, options, retries = 2) {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    const headers = new Headers(options?.headers || {});
    
    // Add CSRF token from cookie if available
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];
    
    if (csrfToken) {
      headers.set('X-XSRF-TOKEN', csrfToken);
    }

    if (token) {
      headers.set('Authorization', 'Bearer ' + token);
    }
    if (!headers.has('Content-Type') && options?.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }
    const mergedOptions = { ...options, headers };

    return fetch(endpoint, mergedOptions).then(function (res) {
      if (res.status === 401) {
        clearAuthAndRedirect();
        return Promise.reject(new Error('Unauthorized'));
      }
      
      // Retry on 5xx errors if retries are left
      if (res.status >= 500 && retries > 0) {
        console.warn(`API call failed with status ${res.status}, retrying... (${retries} left)`);
        return new Promise(resolve => setTimeout(resolve, 1000))
          .then(() => apiFetch(endpoint, options, retries - 1));
      }
      
      return res;
    }).catch(function (error) {
      // Retry on network errors if retries are left
      if (retries > 0 && !error.message.includes('Unauthorized')) {
        console.warn(`API call failed with network error, retrying... (${retries} left)`, error);
        return new Promise(resolve => setTimeout(resolve, 1000))
          .then(() => apiFetch(endpoint, options, retries - 1));
      }
      throw error;
    });
  };

  function guard() {
    if (checkInactivity()) return; // Stop if already redirected due to inactivity

    const current = fileName().toLowerCase();
    const { token, role } = readUserState();

    // Public pages - always allow access
    const publicPages = ['index.html', 'login.html', 'signup.html', '404.html'];
    if (publicPages.includes(current)) {
      return;
    }

    // Protected pages require token validation
    const protectedPages = ['dashboard.html', 'ceo.html', 'portalceo.html', 'education-centre.html', 'centre.html', 'admin-dashboard.html', 'admin.html'];
    if (protectedPages.includes(current)) {
      if (!token) {
        clearAuthAndRedirect();
        return;
      }

      // Validate token and extract role
      const tokenValidation = validateTokenAndRole(token);
      if (!tokenValidation.valid) {
        console.warn('Token validation failed:', tokenValidation.reason);
        clearAuthAndRedirect();
        return;
      }

      // Use role from token if available, fallback to localStorage
      const userRole = tokenValidation.role || role;

      // Page-specific role checks
      switch (current) {
        case 'ceo.html':
        case 'portalceo.html':
          if (userRole !== 'ceo') {
            console.warn('Access denied: CEO page requires CEO role');
            redirect(routeByRole(userRole));
            return;
          }
          break;
          
        case 'admin-dashboard.html':
        case 'admin.html':
          if (!['admin', 'ceo'].includes(userRole)) {
            console.warn('Access denied: Admin page requires Admin or CEO role');
            redirect(routeByRole(userRole));
            return;
          }
          break;
          
        case 'education-centre.html':
        case 'centre.html':
          if (!['centre', 'admin', 'ceo'].includes(userRole)) {
            console.warn('Access denied: Centre page requires Centre, Admin, or CEO role');
            redirect(routeByRole(userRole));
            return;
          }
          break;
      }
    }
  }

  // Run ASAP (still after script load)
  guard();
})();
