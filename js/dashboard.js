/**
 * Student Dashboard - Profile, Typing Dojo, Leaderboard, Trial System
 */
const SAMPLE_TEXT = 'The IELTS academic test assesses your ability to use English in an academic environment. It includes tasks that reflect both study and work situations.';

// ═══════════════════════════════════════════════════════════════
// TRIAL BANNER & MODAL SYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Inject trial banner CSS styles into the page
 */
function injectTrialStyles() {
  if (document.getElementById('trial-styles')) return;
  const style = document.createElement('style');
  style.id = 'trial-styles';
  style.textContent = `
    /* Trial Banner */
    .trial-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      font-family: 'Satoshi', 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 600;
      animation: trialSlideDown 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .trial-banner--active {
      background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
      color: white; 
    }
    .trial-banner--warning {
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      color: white;
    }
    .trial-banner--expired {
      background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
      color: white;
    }
    .trial-banner__icon { font-size: 18px; }
    .trial-banner__text { flex: 1; text-align: center; }
    .trial-banner__btn {
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      padding: 6px 20px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.3s;
      text-decoration: none;
    }
    .trial-banner__btn:hover {
      background: rgba(255,255,255,0.35);
      transform: scale(1.05);
    }
    .trial-banner__close {
      background: none;
      border: none;
      color: rgba(255,255,255,0.7);
      cursor: pointer;
      font-size: 18px;
      padding: 4px;
      line-height: 1;
    }
    .trial-banner__close:hover { color: white; }

    @keyframes trialSlideDown {
      from { transform: translateY(-100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* Trial Expired Modal */
    .trial-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      animation: trialFadeIn 0.4s ease;
    }
    .trial-modal {
      background: white;
      border-radius: 32px;
      max-width: 520px;
      width: 100%;
      padding: 48px 40px;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3);
      animation: trialModalIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .trial-modal__icon {
      width: 80px;
      height: 80px;
      border-radius: 24px;
      background: linear-gradient(135deg, #FEE2E2, #FECACA);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 36px;
    }
    .trial-modal__title {
      font-family: 'Clash Grotesk', sans-serif;
      font-size: 28px;
      font-weight: 800;
      color: #111827;
      margin-bottom: 12px;
    }
    .trial-modal__text {
      color: #6B7280;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .trial-modal__plans {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }
    .trial-modal__plan {
      border: 2px solid #E5E7EB;
      border-radius: 16px;
      padding: 16px;
      text-align: center;
      transition: all 0.3s;
      cursor: pointer;
      text-decoration: none;
      color: inherit;
    }
    .trial-modal__plan:hover {
      border-color: #8B5CF6;
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(139, 92, 246, 0.15);
    }
    .trial-modal__plan--premium {
      border-color: #8B5CF6;
      background: linear-gradient(135deg, #F5F1FF, #EDE9FE);
    }
    .trial-modal__plan-name {
      font-weight: 800;
      font-size: 16px;
      margin-bottom: 4px;
    }
    .trial-modal__plan-price {
      color: #8B5CF6;
      font-weight: 700;
      font-size: 14px;
    }
    .trial-modal__cta {
      display: block;
      width: 100%;
      background: linear-gradient(135deg, #FF6B35, #E85A2A);
      color: white;
      border: none;
      padding: 16px;
      border-radius: 16px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      text-decoration: none;
      text-align: center;
    }
    .trial-modal__cta:hover {
      transform: scale(1.02);
      box-shadow: 0 8px 24px rgba(255, 107, 53, 0.3);
    }
    .trial-modal__dismiss {
      display: block;
      margin-top: 16px;
      background: none;
      border: none;
      color: #9CA3AF;
      font-size: 14px;
      cursor: pointer;
      width: 100%;
    }
    .trial-modal__dismiss:hover { color: #6B7280; }

    /* AI Usage Badge */
    .ai-usage-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #F5F1FF;
      color: #8B5CF6;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
    }
    .ai-usage-badge--low {
      background: #FEF3C7;
      color: #D97706;
    }
    .ai-usage-badge--empty {
      background: #FEE2E2;
      color: #DC2626;
    }

    @keyframes trialFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes trialModalIn {
      from { transform: scale(0.9) translateY(20px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }

    /* Push page content down when banner is showing */
    body.has-trial-banner { padding-top: 48px; }
  `;
  document.head.appendChild(style);
}

/**
 * Render trial banner based on subscription status
 */
function renderTrialBanner(subscription) {
  if (!subscription) return;

  // Remove existing banner
  const existing = document.getElementById('trial-banner');
  if (existing) existing.remove();

  const { plan, isTrialActive, isTrialExpired, trialDaysLeft, dailyAiUsed, dailyAiLimit, aiUsageRemaining } = subscription;

  // Don't show banner for BASIC/PREMIUM with active plans
  if ((plan === 'BASIC' || plan === 'PREMIUM') && !subscription.isPlanExpired) return;

  injectTrialStyles();

  const banner = document.createElement('div');
  banner.id = 'trial-banner';
  banner.className = 'trial-banner';

  if (plan === 'FREE_TRIAL' && isTrialActive) {
    // Active trial
    const urgency = trialDaysLeft <= 7 ? 'trial-banner--warning' : 'trial-banner--active';
    banner.className += ` ${urgency}`;
    banner.innerHTML = `
      <span class="trial-banner__icon">⏰</span>
      <span class="trial-banner__text">
        <strong>${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''}</strong> left in your free trial
        ${trialDaysLeft <= 7 ? ' — Upgrade now to keep full access!' : ''}
      </span>
      <a href="/pricing" class="trial-banner__btn">Upgrade</a>
      <button class="trial-banner__close" onclick="this.parentElement.remove(); document.body.classList.remove('has-trial-banner');">✕</button>
    `;
  } else if (plan === 'FREE' || isTrialExpired) {
    // Expired trial / free plan
    banner.className += ' trial-banner--expired';
    banner.innerHTML = `
      <span class="trial-banner__icon">🔒</span>
      <span class="trial-banner__text">
        Your free trial has ended. AI checks remaining today: <strong>${aiUsageRemaining}/${dailyAiLimit}</strong>
      </span>
      <a href="/pricing" class="trial-banner__btn">Upgrade Now</a>
    `;
  }

  document.body.prepend(banner);
  document.body.classList.add('has-trial-banner');
}

/**
 * Show trial expired modal (blocks view when trial just expired)
 */
function showTrialExpiredModal(subscription) {
  if (!subscription) return;

  // Only show blocking modal for first-time expired users
  const dismissed = sessionStorage.getItem('trial_modal_dismissed');
  if (dismissed) return;

  const { plan, isTrialExpired, aiUsageRemaining } = subscription;
  if (plan !== 'FREE' && !isTrialExpired) return;

  injectTrialStyles();

  const overlay = document.createElement('div');
  overlay.id = 'trial-expired-modal';
  overlay.className = 'trial-modal-overlay';
  overlay.innerHTML = `
    <div class="trial-modal">
      <div class="trial-modal__icon">⏰</div>
      <h2 class="trial-modal__title">Your Free Trial Has Ended</h2>
      <p class="trial-modal__text">
        You still have limited access — you can view your dashboard and scores.
        To take tests and get unlimited AI evaluations, choose a plan below.
        <br><br>
        <span class="ai-usage-badge ${aiUsageRemaining <= 1 ? 'ai-usage-badge--low' : ''}">
          🤖 ${aiUsageRemaining} AI checks remaining today
        </span>
      </p>
      <div class="trial-modal__plans">
        <a href="/pricing" class="trial-modal__plan">
          <div class="trial-modal__plan-name">Basic</div>
          <div class="trial-modal__plan-price">15 AI checks/day</div>
        </a>
        <a href="/pricing" class="trial-modal__plan trial-modal__plan--premium">
          <div class="trial-modal__plan-name">Premium ⭐</div>
          <div class="trial-modal__plan-price">Unlimited access</div>
        </a>
      </div>
      <a href="/pricing" class="trial-modal__cta">View Plans & Pricing</a>
      <button class="trial-modal__dismiss" onclick="document.getElementById('trial-expired-modal').remove(); sessionStorage.setItem('trial_modal_dismissed', '1');">
        Continue with limited access
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
}

/**
 * Fetch trial status and render UI elements
 */
async function loadTrialStatus() {
  if (typeof apiFetch !== 'function') return null;
  try {
    const res = await apiFetch('/api/user/trial-status');
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;

    const sub = json.data;
    renderTrialBanner(sub);
    showTrialExpiredModal(sub);

    return sub;
  } catch (_) {
    return null;
  }
}


// ═══════════════════════════════════════════════════════════════
// EXISTING DASHBOARD FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function loadProfile() {
  if (typeof apiFetch !== 'function') return;
  try {
    const res = await apiFetch('/api/user/profile');
    if (!res.ok) return;
    const data = await res.json();
    const topbar = document.getElementById('app-topbar');
    if (topbar) {
      const subtitle = topbar.querySelector('p');
      if (subtitle && data.full_name) {
        const country = data.country ? ` • ${data.country}` : '';
        subtitle.textContent = `${data.full_name}${country}`;
      }
    }
  } catch (_) {}
}

async function loadLeaderboard() {
  const container = document.getElementById('leaderboard-container');
  if (!container || typeof apiFetch !== 'function') return;
  try {
    // Ensure there are entries: generate placeholders if none exist
    const placeholderRes = await apiFetch('/api/typing/generate-placeholders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 5 })
    });
    // Ignore response; proceed to fetch actual leaderboard
    const res = await apiFetch('/api/typing/leaderboard?limit=5');
    if (!res.ok) {
      container.innerHTML = '<div class="empty-state">No leaderboard data yet.</div>';
      return;
    }
    const data = await res.json();
    const list = data.data?.byWpm || [];
    const top5 = list.slice(0,5);
    if (top5.length === 0) {
      container.innerHTML = '<div class="empty-state">No scores yet. Complete a typing test to appear!</div>';
      return;
    }
    container.innerHTML = top5
      .map((entry, i) => {
        const name = entry.name || entry.username || 'Anonymous';
        const wpm = Number(entry.wpm || entry.bestWpm || 0).toFixed(0);
        const acc = entry.accuracy ? Number(entry.accuracy).toFixed(1) : (entry.avgAccuracy ? Number(entry.avgAccuracy).toFixed(1) : '—');
        return `<div class="list-row"><span class="rank">#${i + 1}</span><span class="name">${name}</span><span class="wpm">${wpm} WPM</span><span class="acc">${acc}%</span></div>`;
      })
      .join('');
  } catch (_) {
    container.innerHTML = '<div class="empty-state">Failed to load leaderboard.</div>';
  }
}

function initTypingDojo() {
  const textarea = document.getElementById('typing-input');
  const hint = document.getElementById('typing-hint');
  const startBtn = document.getElementById('typing-start');
  const wpmDisplay = document.getElementById('typing-wpm');
  const accDisplay = document.getElementById('typing-acc');
  if (!textarea || typeof apiFetch !== 'function') return;

  let startTime = null;
  let originalText = SAMPLE_TEXT;

  function startTest() {
    textarea.value = '';
    textarea.disabled = false;
    textarea.focus();
    startTime = Date.now();
    if (hint) hint.textContent = 'Type the text above. Press Enter when done.';
    if (startBtn) startBtn.style.display = 'none';
  }

  function finishTest() {
    if (!startTime) return;
    const typed = textarea.value.trim();
    const elapsed = (Date.now() - startTime) / 60000; // minutes
    if (elapsed < 0.0001) return;
    const words = typed.split(/\s+/).filter(Boolean).length;
    const wpm = Math.round(words / elapsed);
    const expected = originalText.split(/\s+/).filter(Boolean).length;
    const accuracy = expected > 0 ? Math.min(100, Math.round((typed.length / originalText.length) * 100)) : 0;

    if (wpmDisplay) wpmDisplay.textContent = wpm;
    if (accDisplay) accDisplay.textContent = accuracy + '%';

    apiFetch('/api/typing/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wpm, accuracy }),
    })
      .then((r) => r.json())
      .then(() => {
        if (hint) hint.textContent = 'Score saved! Start again to improve.';
        loadLeaderboard();
      })
      .catch(() => {});

    textarea.disabled = true;
    if (startBtn) {
      startBtn.style.display = 'inline-block';
      startBtn.textContent = 'Try again';
    }
  }

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && startTime) {
      e.preventDefault();
      finishTest();
    }
  });

  if (startBtn) {
    startBtn.addEventListener('click', startTest);
  }
}

async function loadData() {
  // Update target band from onboarding if set
  const userTargetBand = localStorage.getItem('userTargetBand');
  if (userTargetBand) {
    const targetBandElement = document.getElementById('targetBand');
    if (targetBandElement) {
      targetBandElement.textContent = userTargetBand;
    }
  }

  const ids = ['stat-wpm', 'stat-streak', 'stat-mocks', 'stat-band'];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });

  const upcoming = document.getElementById('upcoming-mocks');
  if (upcoming) upcoming.textContent = 'No upcoming mocks yet.';

  await loadProfile();
  await loadLeaderboard();
  initTypingDojo();

  // Load trial status and show banner/modal
  await loadTrialStatus();
}

document.addEventListener('DOMContentLoaded', loadData);
