let currentOnboardingQuestion = 1;

// Check onboarding status from API
async function checkOnboardingStatusFromAPI() {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      // Silently handle missing token
      return false;
    }

    const response = await fetch('/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      // Silently handle profile fetch failure
      return false;
    }

    const data = await response.json();
    if (data.success && data.data) {
      // Silently handle data mapping
      return data.data.onboardingComplete === true;
    }
    return false;
  } catch (error) {
    // Silently handle onboarding check error
    return false;
  }
}

// Show modal if onboarding not complete
async function checkOnboardingStatus() {
  // Silently handle check start
  
  // Check if already shown in this session
  const onboardingShown = sessionStorage.getItem('onboardingShown');
  if (onboardingShown === 'true') {
    // Silently handle already shown
    return;
  }

  // Check API for actual completion status
  const isComplete = await checkOnboardingStatusFromAPI();
  
  if (!isComplete) {
    // Silently handle show modal
    showOnboardingModal();
    sessionStorage.setItem('onboardingShown', 'true');
  } else {
    // Silently handle already complete
  }
}

function showOnboardingModal() {
  const modal = document.getElementById('onboarding-modal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function hideOnboardingModal() {
  const modal = document.getElementById('onboarding-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
}

function nextQuestion(currentNum) {
  // Validate current question
  if (!validateQuestion(currentNum)) {
    return;
  }

  // Hide current, show next
  const currentSection = document.getElementById(`section-${currentNum}`);
  const nextSection = document.getElementById(`section-${currentNum + 1}`);
  
  if (currentSection) currentSection.style.display = 'none';
  if (nextSection) nextSection.style.display = 'block';
  currentOnboardingQuestion = currentNum + 1;
}

function previousQuestion(currentNum) {
  const currentSection = document.getElementById(`section-${currentNum}`);
  const prevSection = document.getElementById(`section-${currentNum - 1}`);
  
  if (currentSection) currentSection.style.display = 'none';
  if (prevSection) prevSection.style.display = 'block';
  currentOnboardingQuestion = currentNum - 1;
}

function validateQuestion(questionNum) {
  if (questionNum === 1) {
    // Question 1: Username
    const usernameInput = document.getElementById('onboarding-username');
    const errorEl = document.getElementById('onboarding-username-error');
    const val = usernameInput ? usernameInput.value.trim() : '';
    const regex = /^[a-z0-9]{3,20}$/;

    if (!val) {
      if (errorEl) { errorEl.textContent = 'Please enter a username'; errorEl.style.display = 'block'; }
      return false;
    }
    if (!regex.test(val)) {
      if (errorEl) { errorEl.textContent = 'Username must be 3-20 lowercase letters and numbers only'; errorEl.style.display = 'block'; }
      return false;
    }
    if (errorEl) errorEl.style.display = 'none';
    return true;
  }

  if (questionNum === 2) {
    // Question 2: Exam date - no validation needed (optional)
    return true;
  }

  if (questionNum === 3) {
    // Question 3: Target band is required
    const targetBand = document.getElementById('target-band');
    if (!targetBand || !targetBand.value) {
      alert('Please select a target band');
      return false;
    }
    return true;
  }

  return true;
}

function skipOnboarding() {
  if (confirm('Skip onboarding? You can update this later in settings.')) {
    hideOnboardingModal();
    localStorage.setItem('onboardingComplete', 'true');
    saveOnboardingData(null, true, '8.0', 'Other');
  }
}

// Handle form submission
document.addEventListener('DOMContentLoaded', function() {
  // Silently handle initialization
  
  // Load modal HTML first (cache-busted to ensure latest version)
  fetch('./components/onboarding-modal.html?v=2')
    .then(r => {
      if (!r.ok) throw new Error(`Failed to load modal: ${r.status}`);
      return r.text();
    })
    .then(html => {
      // Silently handle HTML load
      const wrapper = document.getElementById('onboarding-wrapper');
      if (!wrapper) {
        // Silently handle missing wrapper
        return;
      }
      
      wrapper.innerHTML = html;
      // Silently handle injection
      
      // Set minimum date to today
      const today = new Date().toISOString().split('T')[0];
      const dateInput = document.getElementById('exam-date');
      if (dateInput) dateInput.min = today;

      // Add event listeners
      setupOnboardingListeners();
      // Silently handle listeners attached
      
      // Check if should show onboarding (with a small delay to ensure DOM is ready)
      setTimeout(() => {
        checkOnboardingStatus().catch(err => 
          { /* Silently handle status check error */ }
        );
      }, 100);
    })
    .catch(err => {
      // Silently handle modal load failure
    });
});

function setupOnboardingListeners() {
  // Pre-fill username from localStorage user object
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      const usernameInput = document.getElementById('onboarding-username');
      if (usernameInput && user.username) {
        usernameInput.value = user.username;
      }
    }
  } catch (e) {
    // Silently ignore parse errors
  }

  // Exam date picker toggles
  const examDateValue = document.getElementById('exam-date-value');
  const examDateUnsure = document.getElementById('exam-date-unsure');
  const examDatePickerContainer = document.getElementById('exam-date-picker-container');

  if (examDateValue) {
    examDateValue.addEventListener('change', () => {
      if (examDatePickerContainer) examDatePickerContainer.style.display = 'block';
    });
  }

  if (examDateUnsure) {
    examDateUnsure.addEventListener('change', () => {
      if (examDatePickerContainer) examDatePickerContainer.style.display = 'none';
    });
  }

  // Form submission
  const form = document.getElementById('onboarding-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      handleOnboardingSubmit();
    });
  }
}

async function handleOnboardingSubmit() {
  // Get form values
  const usernameInput = document.getElementById('onboarding-username');
  const examDateOption = document.querySelector('input[name="exam-date-option"]:checked');
  const examDateInput = document.getElementById('exam-date');
  const targetBandSelect = document.getElementById('target-band');
  const sourceRadio = document.querySelector('input[name="source"]:checked');

  // Extract values
  const username = usernameInput ? usernameInput.value.trim() : null;
  const examDateOptionValue = examDateOption ? examDateOption.value : null;
  const examDate = examDateOptionValue === 'date' ? (examDateInput ? examDateInput.value : null) : null;
  const targetBand = targetBandSelect ? targetBandSelect.value : null;
  const sourceOfExposure = sourceRadio ? sourceRadio.value : null;
  const isExamDateUnsure = examDateOptionValue === 'unsure';

  // Validate
  if (!targetBand || !sourceOfExposure) {
    const errorDiv = document.getElementById('onboarding-error');
    if (errorDiv) {
      errorDiv.textContent = 'Please complete all fields';
      errorDiv.style.display = 'block';
    }
    return;
  }

  // Save data
  await saveOnboardingData(examDate, isExamDateUnsure, targetBand, sourceOfExposure, username);
}

async function saveOnboardingData(examDate, isExamDateUnsure, targetBand, sourceOfExposure, username) {
  try {
    const token = localStorage.getItem('authToken');

    if (!token) {
      // Silently handle missing token during save
      const errorDiv = document.getElementById('onboarding-error');
      if (errorDiv) {
        errorDiv.textContent = 'Authentication error. Please login again.';
        errorDiv.style.display = 'block';
      }
      return;
    }

    // Silently handle data sending

    const payload = {
      examDate,
      isExamDateUnsure,
      targetBand,
      sourceOfExposure
    };
    if (username) payload.username = username;

    const response = await fetch('/api/user/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    // Silently handle response status

    const data = await response.json();
    // Silently handle response data

    if (data.success) {
      // Silently handle success

      // Store in localStorage for immediate use
      localStorage.setItem('userTargetBand', targetBand);
      localStorage.setItem('userExamDate', examDate || 'Not set');
      localStorage.setItem('onboardingComplete', 'true');

      // Update stored user object with new username
      if (data.data && data.data.username) {
        try {
          const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
          storedUser.username = data.data.username;
          localStorage.setItem('user', JSON.stringify(storedUser));
        } catch (e) {
          // Silently ignore
        }
      }

      // Show success message
      const errorDiv = document.getElementById('onboarding-error');
      if (errorDiv) {
        errorDiv.textContent = 'Setup complete! Welcome to IELTS Practice.';
        errorDiv.style.color = '#10B981';
        errorDiv.style.display = 'block';
      }

      // Close modal and reload dashboard after a brief delay
      hideOnboardingModal();
      
      setTimeout(() => {
        // Silently handle reload
        location.reload();
      }, 800);
    } else {
      // Silently handle API error
      const errorDiv = document.getElementById('onboarding-error');
      if (errorDiv) {
        errorDiv.textContent = data.message || 'Error saving data. Please try again.';
        errorDiv.style.display = 'block';
      }
    }
  } catch (error) {
    // Silently handle network error
    const errorDiv = document.getElementById('onboarding-error');
    if (errorDiv) {
      errorDiv.textContent = 'Network error. Please check your connection and try again.';
      errorDiv.style.display = 'block';
    }
  }
}
