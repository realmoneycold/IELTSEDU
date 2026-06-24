// ═══════════════════════════════════════════════════════════════
// Dashboard Controller - IELTSPRACTICE
// Aggregates all dashboard data for student dashboard
// ═══════════════════════════════════════════════════════════════

const prisma = require('../models/prisma');
const { getTrialInfo, AI_LIMITS } = require('../middleware/trialMiddleware');

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD DATA ENDPOINT
// GET /api/student/dashboard/full
// ═══════════════════════════════════════════════════════════════

async function getFullDashboardData(req, res) {
  try {
    const userId = req.user.id;

    // Fetch all data in parallel
    const [
      student,
      typingStats,
      studyStreak,
      weeklyProgress,
      mockResults,
      testResults,
      progressSnapshot,
      leaderboard,
      centres
    ] = await Promise.all([
      // 1. Student Profile
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          full_name: true,
          email: true,
          phone: true,
          country: true,
          test_type: true,
          target_band: true,
          current_band: true,
          study_hours: true,
          tasks_done: true,
          weekly_goal_percent: true,
          is_onboarded: true,
          exam_date: true,
          exam_date_text: true,
          centreId: true,
          centre: {
            select: {
              id: true,
              name: true,
              city: true
            }
          },
          plan: true,
          trialStartDate: true,
          trialEndDate: true,
          planExpiresAt: true,
          dailyAiUsageCount: true,
          lastAiUsageDate: true,
        }
      }),

      // 2. Typing Statistics
      prisma.typingResult ? prisma.typingResult.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 10
      }) : Promise.resolve([]),

      // 3. Study Streak
      prisma.studyStreak ? prisma.studyStreak.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 30
      }) : Promise.resolve([]),

      // 4. Weekly Progress
      prisma.weeklyProgress ? prisma.weeklyProgress.findMany({
        where: { userId },
        orderBy: { weekStartDate: 'desc' },
        take: 8
      }) : Promise.resolve([]),

      // 5. Mock Results
      prisma.mockResult ? prisma.mockResult.findMany({
        where: { studentId: userId },
        include: {
          session: {
            select: {
              dateTime: true,
              type: true,
              format: true,
              centre: { select: { name: true, city: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }) : Promise.resolve([]),

      // 6. Practice Test Results with category breakdown
      prisma.practiceTestResult ? prisma.practiceTestResult.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      }) : Promise.resolve([]),

      // 7. Progress Snapshot
      prisma.progressSnapshot ? prisma.progressSnapshot.findFirst({
        where: { userId },
        orderBy: { snapshotDate: 'desc' }
      }) : Promise.resolve(null),

      // 8. Leaderboard (top 10 students by current_band)
      prisma.user.findMany({
        where: { role: 'STUDENT', isActive: true },
        select: {
          id: true,
          full_name: true,
          current_band: true,
          target_band: true,
          study_hours: true
        },
        orderBy: { current_band: 'desc' },
        take: 10
      }),

      // 9. Education Centres
      prisma.educationCentre.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          city: true,
          address: true,
          email: true,
          phone: true,
          website: true,
          rating: true,
          totalStudents: true,
          activeStudents: true
        },
        orderBy: { rating: 'desc' },
        take: 20
      })
    ]);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Calculate derived statistics
    const typingStatsCalculated = typingStats.length > 0 ? {
      bestWpm: Math.max(...typingStats.map(t => t.wpm)),
      avgWpm: (typingStats.reduce((sum, t) => sum + t.wpm, 0) / typingStats.length).toFixed(1),
      avgAccuracy: (typingStats.reduce((sum, t) => sum + t.accuracy, 0) / typingStats.length).toFixed(1),
      totalSessions: typingStats.length
    } : { bestWpm: 0, avgWpm: 0, avgAccuracy: 0, totalSessions: 0 };

    // Calculate study streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let dateCursor = new Date(today);

    for (const streak of studyStreak) {
      const streakDate = new Date(streak.date);
      streakDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((dateCursor - streakDate) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1 && streak.isCompleted) {
        currentStreak++;
        dateCursor = streakDate;
      } else if (diffDays > 1) {
        break;
      }
    }

    // Calculate band progress percentage
    const bandProgress = student.target_band > 0
      ? ((student.current_band / student.target_band) * 100).toFixed(1)
      : 0;

    // Calculate skill averages from test results
    const skillAverages = {
      listening: 0,
      reading: 0,
      writing: 0,
      speaking: 0
    };

    if (testResults.length > 0) {
      const listeningTests = testResults.filter(t => t.testCategory === 'Listening');
      const readingTests = testResults.filter(t => t.testCategory === 'Reading');
      const writingTests = testResults.filter(t => t.testCategory === 'Writing');
      const speakingTests = testResults.filter(t => t.testCategory === 'Speaking');

      if (listeningTests.length > 0) {
        skillAverages.listening = (listeningTests.reduce((sum, t) => sum + t.score, 0) / listeningTests.length).toFixed(1);
      }
      if (readingTests.length > 0) {
        skillAverages.reading = (readingTests.reduce((sum, t) => sum + t.score, 0) / readingTests.length).toFixed(1);
      }
      if (writingTests.length > 0) {
        skillAverages.writing = (writingTests.reduce((sum, t) => sum + t.score, 0) / writingTests.length).toFixed(1);
      }
      if (speakingTests.length > 0) {
        skillAverages.speaking = (speakingTests.reduce((sum, t) => sum + t.score, 0) / speakingTests.length).toFixed(1);
      }
    }

    // Build chart data for skill progression (last 6 tests per skill)
    const chartData = {
      labels: [],
      listening: [],
      reading: [],
      writing: [],
      speaking: []
    };

    // Get recent tests for chart (group by date)
    const recentTests = testResults.slice(0, 30).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const dateMap = new Map();

    recentTests.forEach(test => {
      const dateKey = new Date(test.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { listening: [], reading: [], writing: [], speaking: [] });
      }
      const skill = test.testCategory.toLowerCase();
      if (dateMap.get(dateKey)[skill]) {
        dateMap.get(dateKey)[skill].push(test.score);
      }
    });

    dateMap.forEach((scores, date) => {
      chartData.labels.push(date);
      chartData.listening.push(scores.listening.length > 0
        ? (scores.listening.reduce((a, b) => a + b, 0) / scores.listening.length).toFixed(1)
        : null);
      chartData.reading.push(scores.reading.length > 0
        ? (scores.reading.reduce((a, b) => a + b, 0) / scores.reading.length).toFixed(1)
        : null);
      chartData.writing.push(scores.writing.length > 0
        ? (scores.writing.reduce((a, b) => a + b, 0) / scores.writing.length).toFixed(1)
        : null);
      chartData.speaking.push(scores.speaking.length > 0
        ? (scores.speaking.reduce((a, b) => a + b, 0) / scores.speaking.length).toFixed(1)
        : null);
    });

    // Format centres for frontend
    const formattedCentres = centres.map(c => ({
      id: c.id,
      name: c.name,
      city: c.city,
      district: '',
      type: 'Official',
      rating: c.rating || 0,
      address: c.address || '',
      contactEmail: c.email || '',
      contactPhone: c.phone || '',
      websiteUrl: c.website || '',
      totalStudents: c.totalStudents || 0,
      activeStudents: c.activeStudents || 0,
      isOpen: true
    }));

    // Build response
    res.json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: {
        profile: {
          id: student.id,
          fullName: student.full_name || 'Student',
          email: student.email || '',
          phone: student.phone || '',
          country: student.country || '',
          testType: student.test_type || 'Academic',
          targetBand: student.target_band || 8.0,
          currentBand: student.current_band || 5.0,
          bandProgress: parseFloat(bandProgress),
          studyHours: student.study_hours || 0,
          tasksDone: student.tasks_done || 0,
          weeklyGoalPercent: student.weekly_goal_percent || 0,
          isOnboarded: student.is_onboarded || false,
          examDate: student.exam_date,
          examDateText: student.exam_date_text,
          centre: student.centre,
          memberSince: student.createdAt
        },
        subscription: (() => {
          const info = getTrialInfo(student);
          return {
            plan: info.effectivePlan,
            rawPlan: info.plan,
            isTrialActive: info.isTrialActive,
            isTrialExpired: info.isTrialExpired,
            trialDaysLeft: info.trialDaysLeft,
            trialEndDate: info.trialEndDate,
            isPlanExpired: info.isPlanExpired,
            planExpiresAt: info.planExpiresAt,
            dailyAiUsed: info.dailyAiUsed,
            dailyAiLimit: info.dailyAiLimit,
            aiUsageRemaining: info.aiUsageRemaining,
            limits: AI_LIMITS,
          };
        })(),
        typing: {
          stats: typingStatsCalculated,
          recent: typingStats.map(t => ({
            id: t.id,
            wpm: t.wpm,
            accuracy: t.accuracy,
            durationMinutes: t.durationMinutes,
            date: t.date
          }))
        },
        streak: {
          current: currentStreak,
          todayCompleted: studyStreak.some(s => {
            const d = new Date(s.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === today.getTime() && s.isCompleted;
          }),
          history: studyStreak.slice(0, 7).map(s => ({
            date: s.date,
            isCompleted: s.isCompleted
          }))
        },
        weeklyProgress: {
          current: weeklyProgress.find(p => {
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            return p.weekStartDate.getTime() === startOfWeek.getTime();
          }),
          history: weeklyProgress.map(p => ({
            weekStartDate: p.weekStartDate,
            perfectScoresCount: p.perfectScoresCount,
            progressPercentage: p.progressPercentage
          }))
        },
        mockTests: {
          recent: mockResults.map(m => ({
            id: m.id,
            listening: m.listening,
            reading: m.reading,
            writing: m.writing,
            speaking: m.speaking,
            overall: m.overall,
            session: m.session,
            createdAt: m.createdAt
          })),
          total: mockResults.length
        },
        practiceTests: {
          total: testResults.filter(t => t.isCompleted).length,
          recent: testResults.slice(0, 10).map(t => ({
            id: t.id,
            testIdentifier: t.testIdentifier,
            testCategory: t.testCategory,
            testSubcategory: t.testSubcategory,
            setNumber: t.setNumber,
            score: t.score,
            bandScore: t.bandScore,
            correctAnswers: t.correctAnswers,
            totalQuestions: t.totalQuestions,
            isCompleted: t.isCompleted,
            completedAt: t.completedAt
          }))
        },
        skills: {
          averages: skillAverages,
          chartData: chartData
        },
        progressSnapshot: progressSnapshot ? {
          listeningAvg: progressSnapshot.listeningAvg || 0,
          readingAvg: progressSnapshot.readingAvg || 0,
          writingAvg: progressSnapshot.writingAvg || 0,
          speakingAvg: progressSnapshot.speakingAvg || 0,
          overallAvg: progressSnapshot.overallAvg || 0,
          estimatedBand: progressSnapshot.estimatedBand || 5.0,
          testsCompleted: progressSnapshot.testsCompleted || 0,
          currentStreak: progressSnapshot.currentStreak || 0,
          weakAreas: progressSnapshot.weakAreas ? JSON.parse(progressSnapshot.weakAreas) : [],
          strongAreas: progressSnapshot.strongAreas ? JSON.parse(progressSnapshot.strongAreas) : [],
          isMakingProgress: progressSnapshot.isMakingProgress,
          aiConclusion: progressSnapshot.aiConclusion,
          recommendation: progressSnapshot.recommendation
        } : null,
        leaderboard: leaderboard.map((u, index) => ({
          rank: index + 1,
          id: u.id,
          fullName: u.full_name,
          currentBand: u.current_band,
          targetBand: u.target_band,
          studyHours: u.study_hours
        })),
        centres: formattedCentres
      }
    });

  } catch (error) {
    console.error('Get full dashboard data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      code: 'DASHBOARD_ERROR',
      details: error.message
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD STATISTICS SUMMARY
// GET /api/student/dashboard/stats
// ═══════════════════════════════════════════════════════════════

async function getDashboardStats(req, res) {
  try {
    const userId = req.user.id;

    const [typingCount, streakCount, mockCount, testCount] = await Promise.all([
      prisma.typingResult.count({ where: { userId } }),
      prisma.studyStreak.count({ where: { userId } }),
      prisma.mockResult.count({ where: { studentId: userId } }),
      prisma.practiceTestResult.count({ where: { userId, isCompleted: true } })
    ]);

    const student = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        current_band: true,
        target_band: true,
        study_hours: true,
        tasks_done: true
      }
    });

    res.json({
      success: true,
      data: {
        currentBand: student.current_band || 5.0,
        targetBand: student.target_band || 8.0,
        studyHours: student.study_hours || 0,
        tasksDone: student.tasks_done || 0,
        typingSessions: typingCount,
        studyDays: streakCount,
        mockTests: mockCount,
        practiceTests: testCount
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      code: 'STATS_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  getFullDashboardData,
  getDashboardStats
};
