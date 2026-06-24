// ═════════════════════════════════════════════════════════════
// Education Centre Authentication Guard
// Protects dashboard pages from unauthorized access
// ═════════════════════════════════════════════════════════════

'use strict';

// ─── TOKEN VERIFICATION ─────────────────────────────────────────────────────────────
async function verifyToken(token) {
  try {
    const response = await fetch('/api/auth/education/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.success ? data.data : null;
    }
    return null;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// ─── SESSION CHECK & REDIRECT ─────────────────────────────────────────────────────
async function checkAuthentication() {
  const token = localStorage.getItem('education_token');
  
  if (!token) {
    console.log('No token found, redirecting to login');
    window.location.href = '/education-login.html';
    return;
  }

  const authData = await verifyToken(token);
  
  if (!authData) {
    console.log('Invalid token, redirecting to login');
    localStorage.removeItem('education_token');
    localStorage.removeItem('education_user');
    localStorage.removeItem('education_centre');
    window.location.href = '/education-login.html';
    return;
  }

  console.log('User authenticated:', authData);
  return authData;
}

// ─── DASHBOARD DATA FETCHING ─────────────────────────────────────────────────────
async function fetchDashboardData() {
  const token = localStorage.getItem('education_token');
  
  try {
    const response = await fetch('/api/education/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        populateDashboard(data.data);
      }
    } else if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('education_token');
      localStorage.removeItem('education_user');
      localStorage.removeItem('education_centre');
      window.location.href = '/education-login.html';
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    showError('Failed to load dashboard data');
  }
}

// ─── POPULATE DASHBOARD UI ────────────────────────────────────────────────────
function populateDashboard(data) {
  // Update user info
  const user = JSON.parse(localStorage.getItem('education_user') || '{}');
  const centre = JSON.parse(localStorage.getItem('education_centre') || '{}');
  
  // Update welcome message
  const welcomeElement = document.getElementById('welcomeMessage');
  if (welcomeElement) {
    welcomeElement.textContent = `Welcome back, ${user.fullName || user.email}!`;
  }
  
  // Update centre info
  const centreElement = document.getElementById('centreName');
  if (centreElement) {
    centreElement.textContent = centre.name || 'Education Centre';
  }
  
  // Update statistics
  if (data.statistics) {
    const stats = data.statistics;
    updateStat('totalUsers', stats.totalUsers || 0);
    updateStat('activeUsers', stats.activeUsers || 0);
    updateStat('inactiveUsers', stats.inactiveUsers || 0);
  }
}

function updateStat(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value.toLocaleString();
  }
}

// ─── ERROR HANDLING ───────────────────────────────────────────────────────────
function showError(message) {
  const errorElement = document.getElementById('errorMessage');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    setTimeout(() => {
      errorElement.classList.add('hidden');
    }, 5000);
  }
}

// ─── LOGOUT FUNCTIONALITY ─────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem('education_token');
  localStorage.removeItem('education_user');
  localStorage.removeItem('education_centre');
  window.location.href = '/education-login.html';
}

// ─── INITIALIZATION ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function() {
  console.log('Dashboard loaded, checking authentication...');
  
  const user = await checkAuthentication();
  if (user) {
    await fetchDashboardData();
  }
});

// ─── GLOBAL FUNCTIONS ───────────────────────────────────────────────────────────
window.logout = logout;
window.fetchDashboardData = fetchDashboardData;
