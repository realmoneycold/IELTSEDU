const prisma = require('../models/prisma');
const { getTrialInfo, AI_LIMITS } = require('../middleware/trialMiddleware');

const DEFAULT_CATEGORY_SCORE = 5;
const DEFAULT_TESTS_TAKEN = 0;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Ensure a StudyStreak row exists for today (gray/incomplete). Creates one if missing. */
async function ensureStudyStreakForToday(userId) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const existing =  await prisma.studyStreak.findUnique({
    where: {
      userId_date: { userId, date: today },
    },
  });
  if (!existing) {
    await prisma.studyStreak.create({
      data: { userId, date: today, isCompleted: false },
    });
  }
}

async function getProfile(req, res) {
  try {
    const userId = req.user.id;
    await ensureStudyStreakForToday(userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        full_name: true,
        country: true,
        email: true,
        role: true,
        target_band: true,
        current_band: true,
        tasks_done: true,
        weekly_goal_percent: true,
        typingResults: { select: { id: true } },
      },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const tests_taken = user.typingResults ? user.typingResults.length : 0;
    const { typingResults, ...profile } = user;
    const targetBand = profile.target_band != null ? Number(profile.target_band) : 8;
    const currentBand = profile.current_band != null ? Number(profile.current_band) : 5;
    const tasksDone = profile.tasks_done != null ? Number(profile.tasks_done) : 0;
    const weeklyGoalPercent = profile.weekly_goal_percent != null ? Number(profile.weekly_goal_percent) : 0;
    return res.json({
      ...profile,
      target_band: targetBand,
      current_band: currentBand,
      tasks_done: tasksDone,
      weekly_goal_percent: weeklyGoalPercent,
      listening: DEFAULT_CATEGORY_SCORE,
      reading: DEFAULT_CATEGORY_SCORE,
      writing: DEFAULT_CATEGORY_SCORE,
      speaking: DEFAULT_CATEGORY_SCORE,
      tests_taken,
      overall_band: currentBand,
    });
  } catch (err) {
    console.error('Get profile error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/** Last 6 months performance: TypingResult grouped by month, score = accuracy as band proxy (accuracy/100*9). */
async function getPerformanceHistory(req, res) {
  try {
    const userId = req.user.id;
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const results = await prisma.typingResult.findMany({
      where: { userId, date: { gte: sixMonthsAgo } },
      orderBy: { date: 'asc' },
      select: { date: true, accuracy: true },
    });
    const keys = [];
    const monthMap = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      keys.push(key);
      monthMap[key] = { label: MONTH_NAMES[d.getMonth()], sum: 0, count: 0 };
    }
    results.forEach((r) => {
      const d = new Date(r.date);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (monthMap[key]) {
        const band = (r.accuracy / 100) * 9;
        monthMap[key].sum += band;
        monthMap[key].count += 1;
      }
    });
    const months = keys.map((k) => monthMap[k].label);
    const scores = keys.map((k) => {
      const m = monthMap[k];
      return m.count > 0 ? Math.round((m.sum / m.count) * 10) / 10 : 5.0;
    });
    return res.json({ months, scores });
  } catch (err) {
    console.error('Get performance history error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/** Sessions done, study hours (sum durationMinutes), study streak from consecutive activity days. */
async function getPracticeStats(req, res) {
  try {
    const userId = req.user.id;
    const results = await prisma.typingResult.findMany({
      where: { userId },
      select: { date: true, durationMinutes: true },
    });
    const sessions_done = results.length;
    const study_hours = results.reduce((acc, r) => acc + (r.durationMinutes != null ? r.durationMinutes : 2), 0) / 60;
    const dates = [...new Set(results.map((r) => new Date(r.date).toDateString()))].sort();
    let study_streak = 0;
    if (dates.length > 0) {
      const today = new Date().toDateString();
      let i = dates.length - 1;
      let d = new Date(dates[i]);
      if (d.toDateString() === today || (d.getTime() >= new Date(today).getTime() - 86400000)) {
        study_streak = 1;
        while (i > 0) {
          const prev = new Date(dates[i - 1]);
          const diffDays = (d.getTime() - prev.getTime()) / 86400000;
          if (diffDays > 1.5) break;
          study_streak++;
          i--;
          d = prev;
        }
      }
    }
    return res.json({
      sessions_done: sessions_done,
      study_hours: Math.round(study_hours * 10) / 10,
      study_streak: study_streak,
    });
  } catch (err) {
    console.error('Get practice stats error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/** Nearest upcoming exam date for countdown. */
async function getNextExamDate(req, res) {
  try {
    const next = await prisma.examDate.findFirst({
      where: { date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      select: { date: true, label: true },
    });
    if (!next) {
      return res.json({ date: null, label: null, days_remaining: null });
    }
    const days = Math.ceil((new Date(next.date).getTime() - Date.now()) / 86400000);
    return res.json({
      date: next.date,
      label: next.label,
      days_remaining: days > 0 ? days : 0,
    });
  } catch (err) {
    console.error('Get next exam date error', err);
    return res.json({ date: null, label: null, days_remaining: null });
  }
}

/** Study streak calendar: ensure today exists, return last 28 days of StudyStreak (isCompleted). */
async function getStudyStreak(req, res) {
  try {
    const userId = req.user.id;
    await ensureStudyStreakForToday(userId);
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - 27);
    const rows = await prisma.studyStreak.findMany({
      where: { userId, date: { gte: start, lte: today } },
      orderBy: { date: 'asc' },
      select: { date: true, isCompleted: true },
    });
    const entries = rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      isCompleted: !!r.isCompleted,
    }));
    return res.json({ entries });
  } catch (err) {
    console.error('Get study streak error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getUserProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Parse names
    const nameParts = user.full_name ? user.full_name.trim().split(' ') : ['User'];
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Fetch related progression snapshots
    const snapshot = await prisma.progressSnapshot.findFirst({
        where: { userId },
        orderBy: { id: 'desc' }
    });

    const practiceResults = await prisma.practiceTestResult.findMany({
        where: { userId }
    });

    let L=0, lC=0, R=0, rC=0, W=0, wC=0, S=0, sC=0;
    practiceResults.forEach(r => {
        if(r.testCategory === 'Listening') { L += r.score; lC++; }
        else if(r.testCategory === 'Reading') { R += r.score; rC++; }
        else if(r.testCategory === 'Writing') { W += r.score; wC++; }
        else if(r.testCategory === 'Speaking') { S += r.score; sC++; }
    });

    const calculateAvg = (total, count) => count > 0 ? (total / count) : 0;

    const globalRanking = await prisma.user.count({
        where: { current_band: { gt: user.current_band } }
    }) + 1;

    res.status(200).json({
        success: true,
        data: {
             firstName,
             lastName,
             email: user.email,
             targetBand: user.target_band,
             onboardingComplete: user.onboardingComplete || false,
             isExamDateUnsure: user.isExamDateUnsure || true,
             sourceOfExposure: user.sourceOfExposure || null,
             examDate: user.exam_date || null,
             scores: {
                 listening: snapshot?.listeningAvg || (calculateAvg(L, lC)*0.09) || 5.0,
                 reading: snapshot?.readingAvg || (calculateAvg(R, rC)*0.09) || 5.0,
                 writing: snapshot?.writingAvg || (calculateAvg(W, wC)*0.09) || 5.0,
                 speaking: snapshot?.speakingAvg || (calculateAvg(S, sC)*0.09) || 5.0,
             },
             progressPercentages: {
                 listening: calculateAvg(L, lC),
                 reading: calculateAvg(R, rC),
                 writing: calculateAvg(W, wC),
                 speaking: calculateAvg(S, sC),
             },
             totalSessions: practiceResults.length || user.tasks_done || 0,
             studyHours: user.study_hours || 0,
             currentStreak: snapshot?.currentStreak || 0,
             globalRanking,
             subscription: (() => {
               const info = getTrialInfo(user);
               return {
                 plan: info.effectivePlan,
                 isTrialActive: info.isTrialActive,
                 isTrialExpired: info.isTrialExpired,
                 trialDaysLeft: info.trialDaysLeft,
                 trialEndDate: info.trialEndDate,
                 dailyAiUsed: info.dailyAiUsed,
                 dailyAiLimit: info.dailyAiLimit,
                 aiUsageRemaining: info.aiUsageRemaining,
               };
             })(),
        }
    });

  } catch (err) {
    console.error('Get user profile error:', err);
    return res.status(500).json({ success: false, message: "Database error" });
  }
}

async function saveOnboardingData(req, res) {
  try {
    // FIX 1: Coerce userId to Int — JWT payloads store ids as strings
    const userId = parseInt(req.user.id, 10);
    if (isNaN(userId)) {
      console.error('[onboarding] Invalid userId in JWT payload:', req.user);
      return res.status(401).json({ success: false, message: 'Invalid user token' });
    }

    const { examDate, isExamDateUnsure, targetBand, sourceOfExposure, username } = req.body;

    console.log('[onboarding] Request body:', { examDate, isExamDateUnsure, targetBand, sourceOfExposure, username });
    console.log('[onboarding] userId:', userId);

    // Validation
    if (!targetBand || !sourceOfExposure) {
      return res.status(400).json({
        success: false,
        message: 'Target band and source are required'
      });
    }

    // Validate target band is between 5.5 and 9.0
    const band = parseFloat(targetBand);
    if (isNaN(band) || band < 5.5 || band > 9.0) {
      return res.status(400).json({
        success: false,
        message: 'Target band must be between 5.5 and 9.0'
      });
    }

    // Validate source
    const validSources = ['Friend', 'Social Media', 'Presentations', 'Other'];
    if (!validSources.includes(sourceOfExposure)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid source selection'
      });
    }

    // FIX 2: Safe examDate parsing — guards against empty string / undefined
    let parsedExamDate = null;
    if (!isExamDateUnsure && examDate && String(examDate).trim() !== '') {
      const d = new Date(examDate);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid exam date format' });
      }
      parsedExamDate = d;
    }

    // Build update data
    const updateData = {
      exam_date: parsedExamDate,
      isExamDateUnsure: isExamDateUnsure || false,
      target_band: band,
      sourceOfExposure,
      onboardingComplete: true,
      is_onboarded: true,  // keep in sync with schema's is_onboarded field
    };

    // Validate and add username if provided
    if (username !== undefined && username !== null && username !== '') {
      const cleanUsername = String(username).trim().toLowerCase();
      const usernameRegex = /^[a-z0-9]{3,20}$/;
      if (!usernameRegex.test(cleanUsername)) {
        return res.status(400).json({
          success: false,
          message: 'Username must be 3-20 lowercase letters and numbers only'
        });
      }

      // Check uniqueness (only if changed)
      const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
      if (!currentUser || currentUser.username !== cleanUsername) {
        const existing = await prisma.user.findUnique({ where: { username: cleanUsername }, select: { id: true } });
        if (existing && existing.id !== userId) {
          return res.status(400).json({
            success: false,
            message: 'Username is already taken. Please choose another.'
          });
        }
        updateData.username = cleanUsername;
      }
    }

    // FIX 3: Update user — also sets is_onboarded which aligns with schema
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    console.log('[onboarding] User updated successfully:', updatedUser.id);

    res.status(200).json({
      success: true,
      message: 'Onboarding data saved successfully',
      data: {
        exam_date: updatedUser.exam_date,
        target_band: updatedUser.target_band,
        sourceOfExposure: updatedUser.sourceOfExposure,
        onboardingComplete: updatedUser.onboardingComplete,
        username: updatedUser.username
      }
    });

  } catch (error) {
    // FIX 4: Detailed error logging — logs full Prisma error code/meta
    console.error('[onboarding] Error saving onboarding data:');
    console.error('  Message:', error.message);
    console.error('  Code:', error.code);       // e.g. P2025 = record not found
    console.error('  Meta:', error.meta);        // Prisma error details
    console.error('  Stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error', detail: error.message });
  }
}

module.exports = {
  getProfile,
  getUserProfile,
  getPerformanceHistory,
  getPracticeStats,
  getNextExamDate,
  getStudyStreak,
  saveOnboardingData,
};
