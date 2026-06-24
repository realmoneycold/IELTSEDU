// ═══════════════════════════════════════════════════════════════
// Trial & Subscription Middleware - IELTSPRACTICE
// Handles plan checking, AI token limits, and access control
// ═══════════════════════════════════════════════════════════════

const prisma = require('../models/prisma');

// Daily AI usage limits per plan
const AI_LIMITS = {
  FREE_TRIAL: 999,  // Unlimited during trial
  FREE: 3,
  BASIC: 15,
  PREMIUM: 999999,  // Effectively unlimited
};

/**
 * Calculates trial/plan info for a user record.
 * Pure function — no DB writes.
 */
function getTrialInfo(user) {
  const now = new Date();
  const plan = user.plan || 'FREE_TRIAL';

  let isTrialActive = false;
  let isTrialExpired = false;
  let trialDaysLeft = 0;

  if (plan === 'FREE_TRIAL') {
    if (user.trialEndDate) {
      const endDate = new Date(user.trialEndDate);
      const diffMs = endDate.getTime() - now.getTime();
      trialDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      isTrialActive = trialDaysLeft > 0;
      isTrialExpired = trialDaysLeft <= 0;
    } else {
      // No end date set — treat as active (shouldn't normally happen)
      isTrialActive = true;
      trialDaysLeft = 30;
    }
  }

  // Check if paid plan has expired
  let isPlanExpired = false;
  if ((plan === 'BASIC' || plan === 'PREMIUM') && user.planExpiresAt) {
    isPlanExpired = new Date(user.planExpiresAt) < now;
  }

  // Determine effective plan (if trial expired, they become FREE)
  let effectivePlan = plan;
  if (plan === 'FREE_TRIAL' && isTrialExpired) {
    effectivePlan = 'FREE';
  }
  if (isPlanExpired) {
    effectivePlan = 'FREE';
  }

  // AI usage info
  const todayStr = now.toISOString().slice(0, 10);
  const lastUsageDateStr = user.lastAiUsageDate
    ? new Date(user.lastAiUsageDate).toISOString().slice(0, 10)
    : null;
  const dailyAiUsed = lastUsageDateStr === todayStr ? (user.dailyAiUsageCount || 0) : 0;
  const dailyAiLimit = AI_LIMITS[effectivePlan] || AI_LIMITS.FREE;
  const aiUsageRemaining = Math.max(0, dailyAiLimit - dailyAiUsed);

  return {
    plan,
    effectivePlan,
    isTrialActive,
    isTrialExpired,
    trialDaysLeft,
    trialEndDate: user.trialEndDate,
    isPlanExpired,
    planExpiresAt: user.planExpiresAt,
    dailyAiUsed,
    dailyAiLimit,
    aiUsageRemaining,
  };
}

/**
 * Middleware: checkTrialStatus
 * Attaches trial/plan info to req.user for every authenticated request.
 * Does NOT block — just enriches the request.
 */
function checkTrialStatus(req, res, next) {
  if (!req.user || !req.user.id) return next();

  prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      plan: true,
      trialStartDate: true,
      trialEndDate: true,
      planExpiresAt: true,
      dailyAiUsageCount: true,
      lastAiUsageDate: true,
    },
  })
    .then((user) => {
      if (!user) return next();

      const info = getTrialInfo(user);
      // Merge plan info into req.user
      Object.assign(req.user, info);

      // Auto-downgrade: if trial expired and still marked FREE_TRIAL in DB, update it
      if (info.plan === 'FREE_TRIAL' && info.isTrialExpired) {
        prisma.user.update({
          where: { id: req.user.id },
          data: { plan: 'FREE', planUpdatedAt: new Date() },
        }).catch((err) => console.error('Auto-downgrade error:', err));
      }

      next();
    })
    .catch((err) => {
      console.error('checkTrialStatus error:', err);
      next(); // Don't block on errors
    });
}

/**
 * Middleware: requireActivePlan
 * Blocks users on FREE plan from taking tests.
 * Allows FREE_TRIAL (active), BASIC, PREMIUM.
 */
function requireActivePlan(req, res, next) {
  const effectivePlan = req.user?.effectivePlan || 'FREE';

  if (effectivePlan === 'FREE') {
    return res.status(403).json({
      success: false,
      code: 'PLAN_EXPIRED',
      message: 'Your free trial has expired. Please upgrade your plan to continue taking tests.',
      upgradeUrl: '/pricing',
    });
  }

  next();
}

/**
 * Middleware: requireAiTokens
 * Checks and increments daily AI usage counter.
 * Blocks if daily limit exceeded.
 */
function requireAiTokens(req, res, next) {
  const effectivePlan = req.user?.effectivePlan || 'FREE';
  const limit = AI_LIMITS[effectivePlan] || AI_LIMITS.FREE;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const lastUsageDateStr = req.user?.lastAiUsageDate
    ? new Date(req.user.lastAiUsageDate).toISOString().slice(0, 10)
    : null;

  // Reset counter if it's a new day
  const currentCount = lastUsageDateStr === todayStr
    ? (req.user?.dailyAiUsageCount || 0)
    : 0;

  if (currentCount >= limit) {
    return res.status(429).json({
      success: false,
      code: 'AI_LIMIT_REACHED',
      message: `You've reached your daily AI usage limit (${limit} per day). Upgrade your plan for more!`,
      dailyLimit: limit,
      dailyUsed: currentCount,
      upgradeUrl: '/pricing',
    });
  }

  // Increment usage counter
  const newCount = currentCount + 1;
  prisma.user.update({
    where: { id: req.user.id },
    data: {
      dailyAiUsageCount: newCount,
      lastAiUsageDate: now,
    },
  })
    .then(() => {
      req.user.dailyAiUsed = newCount;
      req.user.aiUsageRemaining = Math.max(0, limit - newCount);
      next();
    })
    .catch((err) => {
      console.error('AI token increment error:', err);
      next(); // Don't block on DB errors
    });
}

/**
 * Middleware: requirePremium
 * Only allows PREMIUM plan users.
 */
function requirePremium(req, res, next) {
  const effectivePlan = req.user?.effectivePlan || 'FREE';

  if (effectivePlan !== 'PREMIUM' && effectivePlan !== 'FREE_TRIAL') {
    return res.status(403).json({
      success: false,
      code: 'PREMIUM_REQUIRED',
      message: 'This feature requires a Premium subscription.',
      upgradeUrl: '/pricing',
    });
  }

  next();
}

module.exports = {
  getTrialInfo,
  checkTrialStatus,
  requireActivePlan,
  requireAiTokens,
  requirePremium,
  AI_LIMITS,
};
