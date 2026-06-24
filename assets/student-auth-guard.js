// ═══════════════════════════════════════════════════════════
// Student Dashboard Authentication Guard
// Protects student dashboard pages from unauthorized access
// ═════════════════════════════════════════════════════════

'use strict';

// ─── TOKEN VERIFICATION ─────────────────────────────────────────────────────────────
async function verifyStudentToken(token) {
  try {
    const response = await fetch('/api/auth/verify-token', {
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
    console.error('Student token verification failed:', error);
    return null;
  }
}

// ─── SESSION CHECK & REDIRECT ─────────────────────────────────────────────────────
async function checkStudentAuthentication() {
  const token = localStorage.getItem('student_token') || sessionStorage.getItem('student_token');
  
  const currentUrl = window.location.pathname + window.location.search;
  const urlParams = new URLSearchParams(window.location.search);
  
  if (!token) {
    console.log('No student token found, redirecting to login/signup');
    if (urlParams.has('room')) {
      window.location.href = '/signup?returnUrl=' + encodeURIComponent(currentUrl);
    } else {
      window.location.href = '/login?returnUrl=' + encodeURIComponent(currentUrl);
    }
    return;
  }

  const authData = await verifyStudentToken(token);
  
  if (!authData) {
    console.log('Invalid student token, redirecting to login');
    localStorage.removeItem('student_token');
    sessionStorage.removeItem('student_token');
    localStorage.removeItem('student_user');
    window.location.href = '/login?returnUrl=' + encodeURIComponent(currentUrl);
    return;
  }

  console.log('Student authenticated:', authData);
  return authData;
}

// ─── FETCH STUDENT DATA ─────────────────────────────────────────────────────
async function fetchStudentData() {
  const token = localStorage.getItem('student_token') || sessionStorage.getItem('student_token');
  
  try {
    const response = await fetch('/api/student/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        populateStudentProfile(data.data);
      }
    } else if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('student_token');
      sessionStorage.removeItem('student_token');
      localStorage.removeItem('student_user');
      window.location.href = '/login.html';
    }
  } catch (error) {
    console.error('Failed to fetch student data:', error);
    showError('Failed to load student data');
  }
}

// ─── POPULATE STUDENT UI ─────────────────────────────────────────────────────
function populateStudentProfile(data) {
  const user = data.user;
  
  // Update welcome message
  const welcomeElement = document.getElementById('welcomeMessage');
  if (welcomeElement) {
    welcomeElement.textContent = `Welcome back, ${user.full_name || user.email}!`;
  }
  
  // Update band information
  updateBandInfo(user.target_band, user.current_band);
  
  // Update progress
  updateProgress(user.tasks_done, user.weekly_goal_percent);
}

function updateBandInfo(target, current) {
  const targetElement = document.getElementById('targetBand');
  const currentElement = document.getElementById('currentBand');
  
  if (targetElement) targetElement.textContent = target ? target.toFixed(1) : 'Not set';
  if (currentElement) currentElement.textContent = current ? current.toFixed(1) : 'Not started';
}

function updateProgress(tasksDone, weeklyGoal) {
  const progressElement = document.getElementById('weeklyProgress');
  if (progressElement) {
    progressElement.textContent = `${tasksDone} tasks (${weeklyGoal.toFixed(1)}% of goal)`;
  }
}

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
function logoutStudent() {
  localStorage.removeItem('student_token');
  sessionStorage.removeItem('student_token');
  localStorage.removeItem('student_user');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userEmail');
  window.location.href = '/login.html';
}

// ─── INITIALIZATION ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function() {
  console.log('Student dashboard loaded, checking authentication...');
  
  const authData = await checkStudentAuthentication();
  if (authData) {
    // Store user data for UI updates
    localStorage.setItem('student_user', JSON.stringify(authData.user));
    
    // Load student data
    await fetchStudentData();
  }
});

// ─── GLOBAL FUNCTIONS ─────────────────────────────────────────────────────
window.logoutStudent = logoutStudent;
window.fetchStudentData = fetchStudentData;
