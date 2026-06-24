// ═════════════════════════════════════════════════════════════
// Teacher Dashboard Authentication Guard
// Protects teacher dashboard pages from unauthorized access
// ═════════════════════════════════════════════════════════════

'use strict';

// ─── TOKEN VERIFICATION ─────────────────────────────────────────────────────────────
async function verifyToken(token) {
  try {
    const response = await fetch('/api/auth/teacher/verify', {
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
  const token = localStorage.getItem('teacher_jwt') || sessionStorage.getItem('teacher_jwt');
  
  console.log('🔍 Checking authentication...');
  console.log('📝 Token from localStorage:', !!localStorage.getItem('teacher_jwt'));
  console.log('📝 Token from sessionStorage:', !!sessionStorage.getItem('teacher_jwt'));
  console.log('🔑 Final token:', token ? 'EXISTS' : 'MISSING');
  
  if (!token) {
    console.log('❌ No teacher token found, redirecting to login');
    window.location.href = '/teacher-login/teacher-login.html';
    return;
  }

  console.log('🔍 Verifying token with server...');
  const authData = await verifyToken(token);
  
  if (!authData) {
    console.log('❌ Invalid teacher token, redirecting to login');
    localStorage.removeItem('teacher_jwt');
    sessionStorage.removeItem('teacher_jwt');
    localStorage.removeItem('teacher_user');
    window.location.href = '/teacher-login/teacher-login.html';
    return;
  }

  console.log('✅ Teacher authenticated successfully:', authData);
  return authData;
}

// ─── DASHBOARD DATA FETCHING ─────────────────────────────────────────────────────
async function fetchDashboardStats() {
  const token = localStorage.getItem('teacher_jwt') || sessionStorage.getItem('teacher_jwt');
  
  try {
    const response = await fetch('/api/teacher/dashboard-stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        populateDashboardStats(data.data);
      }
    } else if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('teacher_jwt');
      sessionStorage.removeItem('teacher_jwt');
      localStorage.removeItem('teacher_user');
      window.location.href = '/teacher-login/teacher-login.html';
    }
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    showError('Failed to load dashboard data');
  }
}

// ─── FETCH LESSONS ─────────────────────────────────────────────────────────────
async function fetchLessons(page = 1, status = '') {
  const token = localStorage.getItem('teacher_jwt') || sessionStorage.getItem('teacher_jwt');
  
  try {
    const url = new URL('/api/teacher/lessons', window.location.origin);
    if (status) url.searchParams.set('status', status);
    url.searchParams.set('page', page);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        populateLessons(data.data);
      }
    }
  } catch (error) {
    console.error('Failed to fetch lessons:', error);
    showError('Failed to load lessons');
  }
}

// ─── FETCH FOLLOWERS ─────────────────────────────────────────────────────────────
async function fetchFollowers(page = 1) {
  const token = localStorage.getItem('teacher_jwt') || sessionStorage.getItem('teacher_jwt');
  
  try {
    const url = new URL('/api/teacher/followers', window.location.origin);
    url.searchParams.set('page', page);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        populateFollowers(data.data);
      }
    }
  } catch (error) {
    console.error('Failed to fetch followers:', error);
    showError('Failed to load followers');
  }
}

// ─── FETCH MATERIALS ─────────────────────────────────────────────────────
async function fetchMaterials(lessonId = null, page = 1) {
  const token = localStorage.getItem('teacher_jwt') || sessionStorage.getItem('teacher_jwt');
  
  try {
    const url = new URL('/api/teacher/materials', window.location.origin);
    if (lessonId) url.searchParams.set('lessonId', lessonId);
    url.searchParams.set('page', page);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        populateMaterials(data.data);
      }
    }
  } catch (error) {
    console.error('Failed to fetch materials:', error);
    showError('Failed to load materials');
  }
}

// ─── POPULATE DASHBOARD UI ─────────────────────────────────────────────────────
function populateDashboardStats(data) {
  // Update welcome message
  const user = JSON.parse(localStorage.getItem('teacher_user') || '{}');
  const welcomeElement = document.getElementById('welcomeMessage');
  if (welcomeElement) {
    welcomeElement.textContent = `Welcome back, ${user.full_name || user.email}!`;
  }
  
  // Update stats
  updateStat('followerCount', data.followerCount || 0);
  updateStat('hoursTaught', data.hoursTaught || 0);
  updateStat('completedLessons', data.completedLessons || 0);
  
  // Update countdown
  if (data.countdown) {
    startCountdown(data.countdown);
  } else {
    const countdownElement = document.getElementById('nextClassCountdown');
    if (countdownElement) {
      countdownElement.innerHTML = '<span class="text-muted">No upcoming classes</span>';
    }
  }
  
  // Update next lesson info
  if (data.nextLesson) {
    const nextLessonElement = document.getElementById('nextLessonInfo');
    if (nextLessonElement) {
      const lessonTime = new Date(data.nextLesson.startTime);
      nextLessonElement.innerHTML = `
        <div class="font-semibold">${data.nextLesson.title}</div>
        <div class="text-sm text-muted">${lessonTime.toLocaleString()}</div>
        <div class="text-sm">
          <a href="${data.nextLesson.zoomLink}" target="_blank" class="text-blue hover:underline">
            Join Zoom Meeting
          </a>
        </div>
      `;
    }
  }
}

function updateStat(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value.toLocaleString();
  }
}

// ─── COUNTDOWN TIMER ─────────────────────────────────────────────────────
let countdownInterval = null;

function startCountdown(countdown) {
  stopCountdown();
  
  const countdownElement = document.getElementById('nextClassCountdown');
  if (!countdownElement) return;
  
  let { hours, minutes, seconds } = countdown;
  
  countdownInterval = setInterval(() => {
    if (seconds > 0) {
      seconds--;
    } else if (minutes > 0) {
      minutes--;
      seconds = 59;
    } else if (hours > 0) {
      hours--;
      minutes = 59;
      seconds = 59;
    } else {
      stopCountdown();
      countdownElement.innerHTML = '<span class="text-red-600">Class started!</span>';
      return;
    }
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    countdownElement.textContent = timeString;
  }, 1000);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

// Stub populate functions (dashboard handles its own rendering)
function populateLessons(data) { console.log('Lessons loaded:', data); }
function populateFollowers(data) { console.log('Followers loaded:', data); }
function populateMaterials(data) { console.log('Materials loaded:', data); }

// ─── ERROR HANDLING ─────────────────────────────────────────────────────
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
  localStorage.removeItem('teacher_jwt');
  sessionStorage.removeItem('teacher_jwt');
  localStorage.removeItem('teacher_user');
  window.location.href = '/teacher-login/teacher-login.html';
}

// ─── INITIALIZATION ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function() {
  console.log('Teacher dashboard loaded, checking authentication...');
  
  const authData = await checkAuthentication();
  if (authData) {
    // Store user data for UI updates
    localStorage.setItem('teacher_user', JSON.stringify(authData.user));
    
    // Load dashboard data
    await fetchDashboardStats();
    await fetchLessons();
    await fetchFollowers();
    await fetchMaterials();
  }
});

// ─── GLOBAL FUNCTIONS ─────────────────────────────────────────────────────
window.logout = logout;
window.fetchLessons = fetchLessons;
window.fetchFollowers = fetchFollowers;
window.fetchMaterials = fetchMaterials;
