/**
 * Statistics Controller
 * Handles test tracking, performance analytics, and weakness identification
 */

'use strict';

const prisma = require('../models/prisma');
const logger = require('../services/loggerService');

/**
 * Save a test attempt when user completes a test
 */
async function saveTestAttempt(req, res) {
  try {
    const userId = req.user.id;
    const {
      testType,
      testId,
      testName,
      skillArea,
      score,
      maxScore = 9.0,
      timeSpentSeconds,
      status = 'COMPLETED',
      answersCorrect,
      answersTotal,
      feedback
    } = req.body;

    // Validate required fields
    if (!testType || !testId || !testName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: testType, testId, testName'
      });
    }

    // Calculate percentage score
    const percentageScore = score && maxScore ? (score / maxScore) * 100 : null;

    // Create test attempt record
    const testAttempt = await prisma.testAttempt.create({
      data: {
        userId,
        testType,
        testId,
        testName,
        skillArea,
        score,
        maxScore,
        percentageScore,
        timeSpentSeconds,
        status,
        answersCorrect,
        answersTotal,
        feedback,
        completedAt: new Date()
      }
    });

    // Update skill statistics
    await updateSkillStatistics(userId, testType);

    // Update study streak
    await updateStudyStreak(userId);

    // Update weakness analysis
    await updateWeaknessAnalysis(userId, testType, skillArea, score, maxScore);

    logger.info(`Test attempt saved for user ${userId}: ${testName}`);

    return res.status(201).json({
      success: true,
      message: 'Test attempt saved successfully',
      data: testAttempt
    });

  } catch (error) {
    logger.error('Error saving test attempt:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save test attempt',
      error: error.message
    });
  }
}

/**
 * Get user's overall statistics
 */
async function getUserStatistics(req, res) {
  try {
    const userId = req.user.id;

    // Get all test attempts
    const testAttempts = await prisma.testAttempt.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' }
    });

    // Get skill statistics
    const skillStats = await prisma.skillStatistics.findMany({
      where: { userId }
    });

    // Get study streak
    const studyStreak = await prisma.userStudyStreak.findUnique({
      where: { userId }
    });

    // Calculate overall progress
    const totalTests = testAttempts.length;
    const completedTests = testAttempts.filter(t => t.status === 'COMPLETED').length;
    const averageScore = testAttempts.length > 0
      ? testAttempts.reduce((sum, t) => sum + (t.percentageScore || 0), 0) / testAttempts.length
      : 0;

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await prisma.testAttempt.findMany({
      where: {
        userId,
        completedAt: { gte: sevenDaysAgo }
      },
      orderBy: { completedAt: 'desc' }
    });

    // Convert skill statistics array to object format for frontend compatibility
    // Also convert percentage scores to IELTS band scores (0-9)
    const skillStatsObject = {};
    skillStats.forEach(stat => {
      const bandScore = (stat.averageScore / 100) * 9; // Convert percentage to band
      skillStatsObject[stat.skill] = {
        ...stat,
        averageBand: Math.round(bandScore * 2) / 2 // Round to nearest 0.5
      };
    });

    // --- Advanced Writing Analytics ---
    const writingAssessments = await prisma.aIWritingAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20 // Analyze up to last 20 writing attempts for trends
    });

    let writingAnalytics = null;
    if (writingAssessments.length > 0) {
      let trSum=0, ccSum=0, lrSum=0, graSum=0;
      let totalWordCount=0, totalGrammarErrors=0, totalLexicalScore=0;
      let countCriteria=0, countDetailed=0;
      
      const grammarErrorTrend = []; // To plot line chart

      writingAssessments.forEach(wa => {
        if (wa.wordCount) totalWordCount += wa.wordCount;
        if (wa.grammarErrors !== null) totalGrammarErrors += wa.grammarErrors;
        if (wa.lexicalScore !== null) totalLexicalScore += wa.lexicalScore;
        countDetailed++;

        grammarErrorTrend.unshift({
          date: wa.createdAt,
          errors: wa.grammarErrors || 0,
          wordCount: wa.wordCount || 0
        });

        const assessment = typeof wa.assessment === 'string' ? JSON.parse(wa.assessment) : wa.assessment;
        if (assessment && assessment.taskFulfillment && assessment.coherenceAndCohesion) {
          trSum += assessment.taskFulfillment.score || 0;
          ccSum += assessment.coherenceAndCohesion.score || 0;
          lrSum += assessment.lexicalRange.score || 0;
          graSum += assessment.grammaticalAccuracy.score || 0;
          countCriteria++;
        }
      });

      writingAnalytics = {
        averages: {
          taskResponse: countCriteria ? (trSum/countCriteria).toFixed(1) : 0,
          coherence: countCriteria ? (ccSum/countCriteria).toFixed(1) : 0,
          lexical: countCriteria ? (lrSum/countCriteria).toFixed(1) : 0,
          grammar: countCriteria ? (graSum/countCriteria).toFixed(1) : 0,
          wordCount: countDetailed ? Math.round(totalWordCount/countDetailed) : 0,
          grammarErrors: countDetailed ? (totalGrammarErrors/countDetailed).toFixed(1) : 0,
          lexicalScore: countDetailed ? (totalLexicalScore/countDetailed).toFixed(1) : 0,
        },
        grammarErrorTrend: grammarErrorTrend
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          totalTests,
          completedTests,
          averageScore: Math.round(averageScore * 10) / 10,
          totalStudyTimeMinutes: Math.floor(
            testAttempts.reduce((sum, t) => sum + (t.timeSpentSeconds || 0), 0) / 60
          )
        },
        skillStatistics: skillStatsObject, // Now in object format with averageBand
        studyStreak: studyStreak || { currentStreak: 0, longestStreak: 0 },
        recentActivity: recentActivity.slice(0, 10),
        testHistory: testAttempts.slice(0, 50), // Last 50 tests
        writingAnalytics: writingAnalytics // Advanced metrics
      }
    });

  } catch (error) {
    logger.error('Error fetching user statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
}

/**
 * Get weakness analysis for user
 */
async function getWeaknessAnalysis(req, res) {
  try {
    const userId = req.user.id;

    const weaknesses = await prisma.weaknessAnalysis.findMany({
      where: { userId },
      orderBy: [
        { priority: 'desc' },
        { failureCount: 'desc' }
      ]
    });

    // Calculate overall skill balance
    const skillStats = await prisma.skillStatistics.findMany({
      where: { userId }
    });

    const skillBalance = skillStats.map(stat => ({
      skill: stat.skill,
      averageScore: stat.averageScore,
      totalAttempts: stat.totalAttempts,
      performance: stat.averageScore >= 7 ? 'strong' : stat.averageScore >= 5 ? 'average' : 'weak'
    }));

    // Generate personalized recommendations
    const recommendations = generateRecommendations(weaknesses, skillBalance);

    return res.status(200).json({
      success: true,
      data: {
        weaknesses: weaknesses.slice(0, 10), // Top 10 weaknesses
        skillBalance,
        recommendations,
        focusAreas: weaknesses
          .filter(w => w.priority >= 3)
          .map(w => w.skillArea)
          .slice(0, 5)
      }
    });

  } catch (error) {
    logger.error('Error fetching weakness analysis:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch weakness analysis',
      error: error.message
    });
  }
}

/**
 * Get progress over time (for charts)
 */
async function getProgressOverTime(req, res) {
  try {
    const userId = req.user.id;
    const { skill, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const whereClause = {
      userId,
      completedAt: { gte: startDate },
      status: 'COMPLETED'
    };

    if (skill) {
      whereClause.testType = skill.toUpperCase();
    }

    const attempts = await prisma.testAttempt.findMany({
      where: whereClause,
      orderBy: { completedAt: 'asc' },
      select: {
        testType: true,
        score: true,
        percentageScore: true,
        completedAt: true,
        testName: true
      }
    });

    // DEBUG: Log what we found
    console.log(`[DEBUG] User ${userId} attempts found:`, attempts.length);
    console.log(`[DEBUG] Attempts:`, attempts.map(a => ({ type: a.testType, score: a.score, date: a.completedAt.toISOString().split('T')[0] })));

    // Group attempts by skill type and calculate CUMULATIVE RUNNING AVERAGES
    // This shows how the user's average score for each skill progresses over time
    const skillAttempts = {};
    
    // Sort all attempts by date first
    attempts.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
    
    // Group by skill type
    attempts.forEach(attempt => {
      const skillType = attempt.testType;
      if (!skillAttempts[skillType]) skillAttempts[skillType] = [];
      skillAttempts[skillType].push(attempt);
    });
    
    // Calculate cumulative running averages for each skill
    const skillProgress = {};
    const allProgressPoints = [];
    
    Object.keys(skillAttempts).forEach(skillType => {
      const tests = skillAttempts[skillType];
      let runningSum = 0;
      
      skillProgress[skillType] = tests.map((test, index) => {
        const isBandScore = skillType === 'SPEAKING' || skillType === 'WRITING';
        let score;
        if (isBandScore) {
          score = test.score || 0;
        } else {
          // Convert percentage to 0-9 scale
          score = ((test.percentageScore || 0) / 100 * 9);
        }
        
        runningSum += score;
        const runningAverage = runningSum / (index + 1);
        const date = test.completedAt.toISOString().split('T')[0];
        
        allProgressPoints.push({
          date,
          skill: skillType,
          runningAverage: parseFloat(runningAverage.toFixed(2)),
          testNumber: index + 1
        });
        
        return {
          date,
          score: runningAverage, // This is the cumulative average up to this test
          testScore: score, // Individual test score
          testNumber: index + 1
        };
      });
    });
    
    // Get unique sorted dates for the overall timeline
    const uniqueDates = [...new Set(allProgressPoints.map(p => p.date))].sort();
    
    // Build daily progress showing the latest running average for each skill on each date
    const dailyProgress = uniqueDates.map(date => {
      const dayPoints = allProgressPoints.filter(p => p.date === date);
      const skillAverages = {};
      
      // Get the latest running average for each skill on this date
      ['LISTENING', 'READING', 'WRITING', 'SPEAKING'].forEach(skillType => {
        const skillPoint = dayPoints
          .filter(p => p.skill === skillType)
          .pop(); // Get the last test of this skill on this date
        if (skillPoint) {
          skillAverages[skillType] = skillPoint.runningAverage;
        }
      });
      
      const allScores = Object.values(skillAverages);
      const overallAvg = allScores.length > 0 
        ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length 
        : 0;
      
      return {
        date,
        averageScore: overallAvg,
        testsCompleted: dayPoints.length,
        skills: Object.keys(skillAverages),
        skillAverages
      };
    });

    // Calculate trend (improving/declining)
    const trend = calculateTrend(attempts);

    // DEBUG: Log what's being returned
    console.log(`[DEBUG] skillProgress:`, skillProgress);
    console.log(`[DEBUG] dailyProgress:`, dailyProgress);

    return res.status(200).json({
      success: true,
      data: {
        dailyProgress,
        skillProgress, // Per-skill progress data
        trend,
        totalTests: attempts.length,
        skill: skill || 'all'
      }
    });

  } catch (error) {
    logger.error('Error fetching progress over time:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch progress data',
      error: error.message
    });
  }
}

/**
 * Get study streak and daily activity
 */
async function getStudyStreak(req, res) {
  try {
    const userId = req.user.id;

    const streak = await prisma.userStudyStreak.findUnique({
      where: { userId }
    });

    // Get last 30 days of activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyLogs = await prisma.dailyStudyLog.findMany({
      where: {
        userId,
        studyDate: { gte: thirtyDaysAgo }
      },
      orderBy: { studyDate: 'desc' }
    });

    return res.status(200).json({
      success: true,
      data: {
        streak: streak || { currentStreak: 0, longestStreak: 0, weeklyGoal: 5 },
        dailyActivity: dailyLogs,
        heatmapData: dailyLogs.map(log => ({
          date: log.studyDate.toISOString().split('T')[0],
          intensity: Math.min(log.testsCompleted / 3, 1) // Normalize to 0-1
        }))
      }
    });

  } catch (error) {
    logger.error('Error fetching study streak:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch study streak',
      error: error.message
    });
  }
}

// ==================== Helper Functions ====================

/**
 * Update skill statistics when a test is completed
 */
async function updateSkillStatistics(userId, testType) {
  try {
    const attempts = await prisma.testAttempt.findMany({
      where: {
        userId,
        testType,
        status: 'COMPLETED'
      }
    });

    if (attempts.length === 0) return;

    // For band-scored tests (SPEAKING, WRITING), use actual score (0-9)
    // For percentage-scored tests (LISTENING, READING), use percentageScore (0-100)
    const scores = attempts.map(a => {
      const isBandScore = a.testType === 'SPEAKING' || a.testType === 'WRITING';
      if (isBandScore) {
        // Convert band score (0-9) to percentage (0-100) for consistent averaging
        return ((a.score || 0) / 9) * 100;
      }
      return a.percentageScore || 0;
    }).filter(s => s > 0);
    
    const times = attempts.map(a => a.timeSpentSeconds || 0).filter(t => t > 0);

    // Calculate best/worst scores using the same logic
    const rawScores = attempts.map(a => {
      const isBandScore = a.testType === 'SPEAKING' || a.testType === 'WRITING';
      if (isBandScore) {
        return ((a.score || 0) / 9) * 100;
      }
      return a.percentageScore || 0;
    }).filter(s => s > 0);

    const stats = {
      totalAttempts: attempts.length,
      completedAttempts: attempts.filter(a => a.status === 'COMPLETED').length,
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      bestScore: rawScores.length > 0 ? Math.max(...rawScores) : 0,
      worstScore: rawScores.length > 0 ? Math.min(...rawScores) : 0,
      totalTimeSpentSeconds: times.reduce((a, b) => a + b, 0),
      averageTimeSpentSeconds: times.length > 0 ? Math.floor(times.reduce((a, b) => a + b, 0) / times.length) : 0,
      lastAttemptAt: attempts[attempts.length - 1].completedAt
    };

    // Calculate improvement rate (compare recent 5 vs previous 5)
    if (scores.length >= 10) {
      const recent = scores.slice(-5);
      const previous = scores.slice(-10, -5);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
      stats.improvementRate = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
    }

    // Calculate consistency (lower standard deviation = more consistent)
    if (scores.length >= 3) {
      const mean = stats.averageScore;
      const squaredDiffs = scores.map(s => Math.pow(s - mean, 2));
      const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
      const stdDev = Math.sqrt(avgSquaredDiff);
      stats.consistencyScore = Math.max(0, 100 - stdDev); // Higher is more consistent
    }

    await prisma.skillStatistics.upsert({
      where: {
        userId_skill: { userId, skill: testType }
      },
      update: stats,
      create: {
        userId,
        skill: testType,
        ...stats
      }
    });

  } catch (error) {
    logger.error('Error updating skill statistics:', error);
  }
}

/**
 * Update study streak when user completes a test
 */
async function updateStudyStreak(userId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = await prisma.userStudyStreak.findUnique({
      where: { userId }
    });

    if (!streak) {
      streak = await prisma.userStudyStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          totalStudyDays: 1,
          lastStudyDate: today
        }
      });
    } else {
      const lastDate = streak.lastStudyDate ? new Date(streak.lastStudyDate) : null;
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let newStreak = streak.currentStreak;
      let newLongest = streak.longestStreak;
      let newTotalDays = streak.totalStudyDays;

      if (lastDate) {
        lastDate.setHours(0, 0, 0, 0);

        if (lastDate.getTime() === today.getTime()) {
          // Already studied today, don't increment
        } else if (lastDate.getTime() === yesterday.getTime()) {
          // Studied yesterday, continue streak
          newStreak += 1;
          newTotalDays += 1;
        } else {
          // Streak broken
          newStreak = 1;
          newTotalDays += 1;
        }
      }

      if (newStreak > newLongest) {
        newLongest = newStreak;
      }

      streak = await prisma.userStudyStreak.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          longestStreak: newLongest,
          totalStudyDays: newTotalDays,
          lastStudyDate: today
        }
      });
    }

    // Update or create daily log
    await prisma.dailyStudyLog.upsert({
      where: {
        userId_studyDate: { userId, studyDate: today }
      },
      update: {
        testsCompleted: { increment: 1 }
      },
      create: {
        userId,
        studyDate: today,
        testsCompleted: 1
      }
    });

  } catch (error) {
    logger.error('Error updating study streak:', error);
  }
}

/**
 * Update weakness analysis based on test performance
 */
async function updateWeaknessAnalysis(userId, testType, skillArea, score, maxScore) {
  try {
    if (!skillArea) return;

    const percentage = score && maxScore ? (score / maxScore) * 100 : 0;
    const isFailure = percentage < 50; // Less than 50% is considered a weakness

    // Determine skill area enum value
    const skillAreaEnum = skillArea.toUpperCase().replace(/ /g, '_');

    let weakness = await prisma.weaknessAnalysis.findUnique({
      where: {
        userId_skillArea: {
          userId,
          skillArea: skillAreaEnum
        }
      }
    });

    if (!weakness) {
      weakness = await prisma.weaknessAnalysis.create({
        data: {
          userId,
          skillArea: skillAreaEnum,
          testType,
          attemptCount: 1,
          failureCount: isFailure ? 1 : 0,
          successRate: isFailure ? 0 : 100,
          averageScore: percentage,
          lastFailedAt: isFailure ? new Date() : null,
          priority: isFailure ? 3 : 1,
          recommendation: generateRecommendation(skillArea, testType, percentage)
        }
      });
    } else {
      const newAttemptCount = weakness.attemptCount + 1;
      const newFailureCount = isFailure ? weakness.failureCount + 1 : weakness.failureCount;
      const newSuccessRate = ((newAttemptCount - newFailureCount) / newAttemptCount) * 100;

      // Calculate new average score
      const newAverageScore = ((weakness.averageScore * weakness.attemptCount) + percentage) / newAttemptCount;

      // Determine priority based on failure rate and score
      let priority = 1;
      if (newSuccessRate < 40) priority = 5;
      else if (newSuccessRate < 60) priority = 4;
      else if (newSuccessRate < 75) priority = 3;
      else if (newSuccessRate < 90) priority = 2;

      weakness = await prisma.weaknessAnalysis.update({
        where: {
          userId_skillArea: { userId, skillArea: skillAreaEnum }
        },
        data: {
          attemptCount: newAttemptCount,
          failureCount: newFailureCount,
          successRate: newSuccessRate,
          averageScore: newAverageScore,
          lastFailedAt: isFailure ? new Date() : weakness.lastFailedAt,
          priority,
          recommendation: generateRecommendation(skillArea, testType, newAverageScore)
        }
      });
    }

  } catch (error) {
    logger.error('Error updating weakness analysis:', error);
  }
}

/**
 * Generate personalized recommendation based on performance
 */
function generateRecommendation(skillArea, testType, score) {
  const recommendations = {
    'READING_COMPREHENSION': {
      weak: 'Focus on skimming and scanning techniques. Practice identifying main ideas and supporting details.',
      average: 'Work on time management. Try to complete reading sections within the time limit.',
      strong: 'Maintain your strong reading skills. Focus on advanced vocabulary acquisition.'
    },
    'LISTENING_COMPREHENSION': {
      weak: 'Practice daily listening with podcasts and lectures. Take notes while listening.',
      average: 'Improve concentration during listening. Practice predicting answers.',
      strong: 'Excellent listening skills! Continue practicing with various accents.'
    },
    'WRITING_TASK_1': {
      weak: 'Study graph/chart vocabulary. Practice describing trends and comparisons.',
      average: 'Focus on structure: introduction, overview, detailed paragraphs.',
      strong: 'Great Task 1 skills! Work on vocabulary variety and complex sentences.'
    },
    'WRITING_TASK_2': {
      weak: 'Learn essay structures. Practice planning before writing. Build vocabulary.',
      average: 'Improve coherence and cohesion. Use linking words effectively.',
      strong: 'Strong essay writing! Focus on sophisticated vocabulary and grammar.'
    },
    'SPEAKING_PART_1': {
      weak: 'Practice answering common questions. Record yourself and listen back.',
      average: 'Work on fluency. Avoid long pauses. Expand your answers.',
      strong: 'Good Part 1 performance! Maintain natural conversation flow.'
    },
    'SPEAKING_PART_2': {
      weak: 'Practice cue card preparation (1 minute). Use the PPF method (Past, Present, Future).',
      average: 'Improve time management. Speak for the full 2 minutes. Add details.',
      strong: 'Excellent Part 2 skills! Continue practicing diverse topics.'
    },
    'SPEAKING_PART_3': {
      weak: 'Practice abstract thinking. Give opinions with reasons and examples.',
      average: 'Develop deeper answers. Compare different perspectives.',
      strong: 'Strong discussion skills! Maintain complex grammatical structures.'
    }
  };

  const key = skillArea || testType;
  const category = score < 50 ? 'weak' : score < 75 ? 'average' : 'strong';

  return recommendations[key]?.[category] || 'Keep practicing regularly to improve your skills.';
}

/**
 * Generate comprehensive recommendations based on all data
 */
function generateRecommendations(weaknesses, skillBalance) {
  const recommendations = [];

  // Top 3 weaknesses to focus on
  const topWeaknesses = weaknesses
    .filter(w => w.priority >= 3)
    .slice(0, 3);

  if (topWeaknesses.length > 0) {
    recommendations.push({
      type: 'priority',
      title: 'Focus Areas',
      message: `Your weakest areas are: ${topWeaknesses.map(w => w.skillArea.replace(/_/g, ' ')).join(', ')}. Focus on these first.`,
      actions: topWeaknesses.map(w => w.recommendation)
    });
  }

  // Skill balance recommendations
  const weakSkills = skillBalance.filter(s => s.performance === 'weak');
  if (weakSkills.length > 0) {
    recommendations.push({
      type: 'balance',
      title: 'Skill Balance',
      message: `Your ${weakSkills.map(s => s.skill).join(', ')} skills need improvement for a balanced IELTS score.`,
      actions: weakSkills.map(s => `Dedicate more time to ${s.skill} practice tests.`)
    });
  }

  // Study consistency recommendation
  const allAttempts = weaknesses.reduce((sum, w) => sum + w.attemptCount, 0);
  if (allAttempts < 10) {
    recommendations.push({
      type: 'consistency',
      title: 'Study Consistency',
      message: 'You need more practice tests to get accurate analytics.',
      actions: ['Complete at least 2-3 tests per skill area for better insights.']
    });
  }

  return recommendations;
}

/**
 * Calculate performance trend
 */
function calculateTrend(attempts) {
  if (attempts.length < 6) return 'insufficient_data';

  const recent = attempts.slice(-3);
  const previous = attempts.slice(-6, -3);

  const recentAvg = recent.reduce((sum, a) => sum + (a.percentageScore || 0), 0) / recent.length;
  const previousAvg = previous.reduce((sum, a) => sum + (a.percentageScore || 0), 0) / previous.length;

  const diff = recentAvg - previousAvg;

  if (diff > 10) return 'improving';
  if (diff < -10) return 'declining';
  return 'stable';
}

/**
 * Get comprehensive overview for dashboard
 */
async function getOverview(req, res) {
  try {
    const userId = req.user.id;

    // Get all data in parallel
    const [testAttempts, skillStats, studyStreak, weaknesses, dailyLogs] = await Promise.all([
      prisma.testAttempt.findMany({ where: { userId }, orderBy: { completedAt: 'desc' } }),
      prisma.skillStatistics.findMany({ where: { userId } }),
      prisma.userStudyStreak.findUnique({ where: { userId } }),
      prisma.weaknessAnalysis.findMany({ where: { userId }, orderBy: [{ priority: 'desc' }, { failureCount: 'desc' }] }),
      prisma.dailyStudyLog.findMany({
        where: { userId, studyDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        orderBy: { studyDate: 'desc' }
      })
    ]);

    const totalTests = testAttempts.length;
    const completedTests = testAttempts.filter(t => t.status === 'COMPLETED').length;
    const averageScore = testAttempts.length > 0
      ? testAttempts.reduce((sum, t) => sum + (t.percentageScore || 0), 0) / testAttempts.length
      : 0;

    // Get recent activity (last 14 days, up to 20 entries)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const recentActivity = await prisma.testAttempt.findMany({
      where: { userId, completedAt: { gte: fourteenDaysAgo } },
      orderBy: { completedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        testName: true,
        testType: true,
        score: true,
        maxScore: true,
        percentageScore: true,
        status: true,
        completedAt: true
      }
    });

    // --- Advanced Writing Analytics (same as getUserStatistics) ---
    const writingAssessments = await prisma.aIWritingAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    let writingAnalytics = null;
    if (writingAssessments.length > 0) {
      let trSum=0, ccSum=0, lrSum=0, graSum=0;
      let totalWordCount=0, totalGrammarErrors=0, totalLexicalScore=0;
      let countCriteria=0, countDetailed=0;
      const grammarErrorTrend = [];

      writingAssessments.forEach(wa => {
        if (wa.wordCount) totalWordCount += wa.wordCount;
        if (wa.grammarErrors !== null) totalGrammarErrors += wa.grammarErrors;
        if (wa.lexicalScore !== null) totalLexicalScore += wa.lexicalScore;
        countDetailed++;
        grammarErrorTrend.unshift({ date: wa.createdAt, errors: wa.grammarErrors || 0, wordCount: wa.wordCount || 0 });

        const assessment = typeof wa.assessment === 'string' ? JSON.parse(wa.assessment) : wa.assessment;
        if (assessment && assessment.taskFulfillment && assessment.coherenceAndCohesion) {
          trSum += assessment.taskFulfillment.score || 0;
          ccSum += assessment.coherenceAndCohesion.score || 0;
          lrSum += (assessment.lexicalRange?.score || assessment.lexicalResource?.score || 0);
          graSum += (assessment.grammaticalAccuracy?.score || assessment.grammarAccuracy?.score || 0);
          countCriteria++;
        }
      });

      writingAnalytics = {
        averages: {
          taskResponse: countCriteria ? parseFloat((trSum/countCriteria).toFixed(1)) : 0,
          coherence: countCriteria ? parseFloat((ccSum/countCriteria).toFixed(1)) : 0,
          lexical: countCriteria ? parseFloat((lrSum/countCriteria).toFixed(1)) : 0,
          grammar: countCriteria ? parseFloat((graSum/countCriteria).toFixed(1)) : 0,
          wordCount: countDetailed ? Math.round(totalWordCount/countDetailed) : 0,
          grammarErrors: countDetailed ? parseFloat((totalGrammarErrors/countDetailed).toFixed(1)) : 0,
          lexicalScore: countDetailed ? parseFloat((totalLexicalScore/countDetailed).toFixed(1)) : 0,
        },
        grammarErrorTrend: grammarErrorTrend
      };
    }

    // --- Study Heatmap: aggregate test completions by date (last 28 days) ---
    const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const completedAttempts = testAttempts.filter(t => t.completedAt && new Date(t.completedAt) >= twentyEightDaysAgo);
    const dateCountMap = {};
    completedAttempts.forEach(t => {
      const dateKey = new Date(t.completedAt).toISOString().slice(0, 10); // 'YYYY-MM-DD'
      dateCountMap[dateKey] = (dateCountMap[dateKey] || 0) + 1;
    });
    const studyHeatmap = Object.entries(dateCountMap).map(([date, count]) => ({ date, count }));

    const overview = {
      overview: {
        totalTests,
        completedTests,
        averageScore: Math.round(averageScore * 10) / 10,
        totalStudyTimeMinutes: Math.floor(
          testAttempts.reduce((sum, t) => sum + (t.timeSpentSeconds || 0), 0) / 60
        )
      },
      skillStatistics: skillStats,
      weaknesses: {
        weaknesses: weaknesses.slice(0, 10),
        skillBalance: skillStats.map(stat => ({
          skill: stat.skill,
          averageScore: stat.averageScore,
          totalAttempts: stat.totalAttempts,
          performance: stat.averageScore >= 7 ? 'strong' : stat.averageScore >= 5 ? 'average' : 'weak'
        })),
        recommendations: [],
        focusAreas: weaknesses.filter(w => w.priority >= 3).map(w => w.skillArea).slice(0, 5)
      },
      progress: {
        dailyProgress: [],
        trend: 'insufficient_data',
        totalTests: testAttempts.length,
        skill: 'all'
      },
      studyStreak: studyStreak || { currentStreak: 0, longestStreak: 0, weeklyGoal: 5 },
      dailyLogs: dailyLogs,
      studyHeatmap: studyHeatmap,
      recentActivity,
      testHistory: testAttempts.slice(0, 50),
      writingAnalytics: writingAnalytics,
      lastUpdated: new Date()
    };

    res.json({ success: true, data: overview });
  } catch (error) {
    logger.error('Error getting overview:', error);
    res.status(500).json({ success: false, message: 'Failed to get overview' });
  }
}

/**
 * Get detailed feedback for a specific test attempt
 */
async function getTestDetails(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // First try to find the generic TestAttempt to make sure it belongs to this user
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: parseInt(id) }
    });

    if (!attempt || attempt.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Test attempt not found' });
    }

    let detailedFeedback = null;
    let rawText = '';

    // If it's a Writing test, let's try to find the AIWritingAssessment that matches the completedAt time roughly
    if (attempt.testType === 'WRITING') {
      const writingAssessment = await prisma.aIWritingAssessment.findFirst({
        where: {
          userId: userId,
          createdAt: {
            gte: new Date(attempt.completedAt.getTime() - 1000 * 60 * 5), // within 5 minutes before
            lte: new Date(attempt.completedAt.getTime() + 1000 * 60 * 5)  // within 5 minutes after
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (writingAssessment) {
        detailedFeedback = typeof writingAssessment.assessment === 'string' 
          ? JSON.parse(writingAssessment.assessment) 
          : writingAssessment.assessment;
        rawText = writingAssessment.writingText;
      }
    } else if (attempt.feedback) {
      try {
        detailedFeedback = JSON.parse(attempt.feedback);
      } catch (e) {
        detailedFeedback = { text: attempt.feedback };
      }
    }

    res.json({
      success: true,
      data: {
        attempt,
        feedback: detailedFeedback,
        rawText: rawText
      }
    });
  } catch (error) {
    logger.error('Error getting test details:', error);
    res.status(500).json({ success: false, message: 'Failed to get test details' });
  }
}

module.exports = {
  saveTestAttempt,
  getTestDetails,
  getUserStatistics,
  getWeaknessAnalysis,
  getProgressOverTime,
  getStudyStreak,
  getOverview
};
