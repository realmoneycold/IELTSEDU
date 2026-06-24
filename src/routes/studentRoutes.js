// ═══════════════════════════════════════════════════════════════
// Student Routes - IELTSPRACTICE
// Complete CRUD operations for students
// ═══════════════════════════════════════════════════════════════

const express = require('express');
// Legacy typing imports removed inline since they no longer exist in studentController
const { verifyToken, checkRole } = require('../middleware/auth');
const { requireAuth } = require('../middleware/unified-auth');
const { checkTrialStatus, requireActivePlan, requireAiTokens } = require('../middleware/trialMiddleware');
const prisma = require('../models/prisma');
const studentCtrl = require('../controllers/studentController');

const router = express.Router();

// Apply trial status check to ALL student routes
router.use(checkTrialStatus);

// ─── LEGACY TYPING ROUTES (kept for backward compatibility) ───
// router.get('/me/typing-stats', verifyToken, checkRole('STUDENT'), getMyTypingStats);
// router.post('/me/typing-stats', verifyToken, checkRole('STUDENT'), addTypingResult);
// router.get('/leaderboard', verifyToken, checkRole('STUDENT', 'ADMIN', 'CEO'), getLeaderboard);

// ═══════════════════════════════════════════════════════════════
// DASHBOARD & STATS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/student/dashboard-stats
 * Get comprehensive dashboard statistics
 */
router.get('/dashboard-stats', requireAuth('STUDENT'), studentCtrl.getDashboardStats);

/**
 * GET /api/student/dashboard-data
 * Get all dashboard data in one call
 */
router.get('/dashboard-data', requireAuth('STUDENT'), async (req, res) => {
  try {
    const userId = req.user.id;

    const student = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        full_name: true,
        username: true,
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
        target_band_range: true,
        study_commitment: true,
        referral_source: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student data not found',
        code: 'STUDENT_NOT_FOUND'
      });
    }
    
    // DEBUG: Log what we found in the database
    console.log(`[dashboard-data] User ${userId} - exam_date: ${student.exam_date}, target_band: ${student.target_band}`);

    const bandProgress = student.target_band > 0
      ? ((student.current_band / student.target_band) * 100).toFixed(1)
      : 0;

    const dashboardData = {
      id: student.id,
      fullName: student.full_name || '',
      username: student.username || '',
      email: student.email || '',
      phone: student.phone || '',
      country: student.country || '',
      testType: student.test_type || '',
      targetBand: student.target_band || 7.0,
      currentBand: student.current_band || 5.0,
      bandProgress: parseFloat(bandProgress),
      studyHours: student.study_hours || 0,
      tasksDone: student.tasks_done || 0,
      weeklyGoalPercent: student.weekly_goal_percent || 0,
      isOnboarded: student.is_onboarded || false,
      examDate: student.exam_date,
      examDateText: student.exam_date_text,
      targetBandRange: student.target_band_range,
      studyCommitment: student.study_commitment,
      referralSource: student.referral_source,
      memberSince: student.createdAt,
      lastUpdated: student.updatedAt
    };

    // DEBUG: Log the exact response being sent
    console.log(`[dashboard-data] RESPONSE for User ${userId}:`, JSON.stringify({
      examDate: dashboardData.examDate,
      targetBand: dashboardData.targetBand
    }));

    res.json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// PROFILE CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/student/profile
 * Fetch student profile information
 */
router.get('/profile', requireAuth('STUDENT'), studentCtrl.getStudentProfile);

/**
 * PUT /api/student/profile
 * Update student profile information
 */
router.put('/profile', requireAuth('STUDENT'), studentCtrl.updateStudentProfile);

/**
 * PATCH /api/student/profile/password
 * Update student password
 */
router.patch('/profile/password', requireAuth('STUDENT'), studentCtrl.updateStudentPassword);

/**
 * POST /api/student/onboarding
 * Save onboarding data for new student
 */
router.post('/onboarding', requireAuth('STUDENT'), studentCtrl.completeOnboarding);

/**
 * POST /api/student/reset-onboarding
 * Reset onboarding status for testing
 */
router.post('/reset-onboarding', requireAuth('STUDENT'), async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.user.update({
      where: { id: userId },
      data: {
        is_onboarded: false,
        exam_date: null,
        exam_date_text: null,
        target_band_range: null,
        study_commitment: null,
        referral_source: null
      }
    });

    res.json({
      success: true,
      message: 'Onboarding reset successfully'
    });

  } catch (error) {
    console.error('Reset onboarding error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// TYPING PRACTICE CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/student/typing
 * Get typing history with pagination
 * Query: ?page=1&limit=20&from=2024-01-01&to=2024-12-31
 */
router.get('/typing', requireAuth('STUDENT'), studentCtrl.getTypingHistory);

/**
 * POST /api/student/typing
 * Save typing result
 * Body: { wpm, accuracy, durationMinutes? }
 */
router.post('/typing', requireAuth('STUDENT'), requireActivePlan, studentCtrl.saveTypingResult);

// ═══════════════════════════════════════════════════════════════
// STUDY STREAK CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/student/streak
 * Get study streak info
 */
router.get('/streak', requireAuth('STUDENT'), studentCtrl.getStudyStreak);

/**
 * POST /api/student/streak
 * Mark today's study as complete
 */
router.post('/streak', requireAuth('STUDENT'), studentCtrl.markStudyComplete);

// ═══════════════════════════════════════════════════════════════
// WEEKLY PROGRESS CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/student/weekly-progress
 * Get weekly progress history
 */
router.get('/weekly-progress', requireAuth('STUDENT'), studentCtrl.getWeeklyProgress);

/**
 * PUT /api/student/weekly-progress
 * Update weekly progress for current week
 * Body: { perfectScoresCount, progressPercentage }
 */
router.put('/weekly-progress', requireAuth('STUDENT'), studentCtrl.updateWeeklyProgress);

// ═══════════════════════════════════════════════════════════════
// MOCK TEST RESULTS CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/student/mock-results
 * Get mock test results with pagination
 * Query: ?page=1&limit=10
 */
router.get('/mock-results', requireAuth('STUDENT'), studentCtrl.getMockResults);

/**
 * POST /api/student/mock-results
 * Save mock test result
 * Body: { sessionId?, listening, reading, writing, speaking, overall }
 */
router.post('/mock-results', requireAuth('STUDENT'), requireActivePlan, studentCtrl.saveMockResult);

// ═══════════════════════════════════════════════════════════════
// AI CHAT SESSIONS CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/student/ai-chats
 * Get AI chat session history
 * Query: ?page=1&limit=10
 */
router.get('/ai-chats', requireAuth('STUDENT'), studentCtrl.getAiChats);

/**
 * POST /api/student/ai-chats
 * Create new AI chat session
 * Body: { topic? }
 */
router.post('/ai-chats', requireAuth('STUDENT'), studentCtrl.createAiChat);

/**
 * PUT /api/student/ai-chats/:id
 * Update AI chat session
 * Body: { messageCount?, history? }
 */
router.put('/ai-chats/:id', requireAuth('STUDENT'), studentCtrl.updateAiChat);

/**
 * DELETE /api/student/ai-chats/:id
 * Delete AI chat session
 */
router.delete('/ai-chats/:id', requireAuth('STUDENT'), studentCtrl.deleteAiChat);

// ═══════════════════════════════════════════════════════════════
// STUDY GROUP APPLICATIONS CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/student/applications
 * Get student's group applications
 */
router.get('/applications', requireAuth('STUDENT'), studentCtrl.getApplications);

/**
 * POST /api/student/applications
 * Apply to a study group
 * Body: { groupId }
 */
router.post('/applications', requireAuth('STUDENT'), studentCtrl.createApplication);

/**
 * DELETE /api/student/applications/:id
 * Withdraw application
 */
router.delete('/applications/:id', requireAuth('STUDENT'), studentCtrl.deleteApplication);

// ═══════════════════════════════════════════════════════════════
// REPORTS CRUD (Student submitting reports)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/student/reports
 * Get student's submitted reports
 */
router.get('/reports', requireAuth('STUDENT'), studentCtrl.getReports);

/**
 * POST /api/student/reports
 * Submit a report/issue
 * Body: { testId, questionId?, type, description }
 */
router.post('/reports', requireAuth('STUDENT'), studentCtrl.createReport);

// ═══════════════════════════════════════════════════════════════
// TEST PROGRESSION SYSTEM - Save results & unlock levels
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/student/test-results
 * Save a practice test result
 * Body: { testIdentifier, testCategory, testSubcategory?, setNumber, score, bandScore?, correctAnswers, totalQuestions, timeSpentSeconds, answers?, isCompleted }
 */
router.post('/test-results', requireAuth('STUDENT'), requireActivePlan, studentCtrl.saveTestResult);

/**
 * GET /api/student/test-results
 * Get all test results with optional filtering
 * Query: ?category=Listening&subcategory=Full
 */
router.get('/test-results', requireAuth('STUDENT'), studentCtrl.getTestResults);

/**
 * GET /api/student/test-results/:id
 * Get single test result by ID
 */
router.get('/test-results/:id', requireAuth('STUDENT'), studentCtrl.getTestResult);

/**
 * GET /api/student/test-unlocks
 * Get unlocked levels
 * Query: ?category=Listening
 */
router.get('/test-unlocks', requireAuth('STUDENT'), studentCtrl.getTestUnlocks);

/**
 * GET /api/student/test-unlocks/check/:category/:subcategory?/:setNumber
 * Check if a specific level is unlocked
 * Example: /api/student/test-unlocks/check/Listening/Full/5
 */
router.get('/test-unlocks/check/:category/:subcategory?/:setNumber', requireAuth('STUDENT'), studentCtrl.checkLevelUnlock);

/**
 * POST /api/student/progress-snapshot
 * Create or update progress snapshot with AI analysis
 * Body: { aiConclusion?, recommendation?, weakAreas?, strongAreas? }
 */
router.post('/progress-snapshot', requireAuth('STUDENT'), studentCtrl.createProgressSnapshot);

/**
 * GET /api/student/progress-snapshot
 * Get latest progress snapshot
 */
router.get('/progress-snapshot', requireAuth('STUDENT'), studentCtrl.getProgressSnapshot);

/**
 * GET /api/student/progress/ai-analysis
 * Get AI-powered progress analysis
 */
router.get('/progress/ai-analysis', requireAuth('STUDENT'), studentCtrl.getAIProgressAnalysis);

// ═══════════════════════════════════════════════════════════════
// AI CHAT - Ollama Integration
// ═══════════════════════════════════════════════════════════════

const { processAIChat, generateAIFeedback } = require('../services/ollamaService');

/**
 * POST /api/student/ai-chat
 * Send message to AI tutor and get response
 * Body: { message, chatHistoryId? }
 */
router.post('/ai-chat', requireAuth('STUDENT'), requireAiTokens, async (req, res) => {
  try {
    const { message, chatHistoryId } = req.body;
    const userId = req.user.id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message cannot be empty',
        code: 'INVALID_MESSAGE'
      });
    }

    // Get chat history if provided
    let chatHistory = [];
    if (chatHistoryId) {
      try {
        const existingChat = await prisma.aiChatSession.findUnique({
          where: { id: chatHistoryId },
          select: { history: true }
        });
        if (existingChat && existingChat.history) {
          chatHistory = typeof existingChat.history === 'string' 
            ? JSON.parse(existingChat.history) 
            : existingChat.history;
        }
      } catch (error) {
        console.warn('Failed to load chat history:', error);
      }
    }

    // Process message with Ollama
    const result = await processAIChat(message, chatHistory);

    if (result.success) {
      // Save or update chat session in database
      try {
        let session;
        
        if (chatHistoryId) {
          // Update existing session
          const updatedHistory = [
            ...(chatHistory || []),
            { role: 'student', content: message },
            { role: 'tutor', content: result.reply }
          ];

          session = await prisma.aiChatSession.update({
            where: { id: chatHistoryId },
            data: {
              history: JSON.stringify(updatedHistory),
              messageCount: { increment: 2 },
              lastMessageAt: new Date()
            },
            select: { id: true, messageCount: true }
          });
        } else {
          // Create new session
          const initialHistory = [
            { role: 'student', content: message },
            { role: 'tutor', content: result.reply }
          ];

          session = await prisma.aiChatSession.create({
            data: {
              userId: userId,
              history: JSON.stringify(initialHistory),
              messageCount: 2,
              model: result.model || 'ollama',
              lastMessageAt: new Date()
            },
            select: { id: true, messageCount: true }
          });
        }

        res.json({
          success: true,
          reply: result.reply,
          chatId: session.id,
          messageCount: session.messageCount,
          timestamp: result.timestamp
        });
      } catch (dbError) {
        console.error('Error saving chat session:', dbError);
        // Still return the response even if db save fails
        res.json({
          success: true,
          reply: result.reply,
          warning: 'Response retrieved but not saved to history',
          timestamp: result.timestamp
        });
      }
    } else {
      res.status(503).json({
        success: false,
        error: result.reply || 'AI service unavailable',
        code: 'AI_SERVICE_ERROR'
      });
    }
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * GET /api/student/ai-chat/history/:chatId
 * Get chat history
 */
router.get('/ai-chat/history/:chatId', requireAuth('STUDENT'), async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await prisma.aiChatSession.findFirst({
      where: {
        id: chatId,
        userId: userId
      },
      select: {
        id: true,
        history: true,
        messageCount: true,
        createdAt: true,
        lastMessageAt: true
      }
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat history not found',
        code: 'NOT_FOUND'
      });
    }

    const history = typeof chat.history === 'string' 
      ? JSON.parse(chat.history) 
      : chat.history;

    res.json({
      success: true,
      data: {
        chatId: chat.id,
        messages: history || [],
        messageCount: chat.messageCount,
        createdAt: chat.createdAt,
        lastMessageAt: chat.lastMessageAt
      }
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// STUDENT TO-DOS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/student/todos
 * Get all current todo items
 */
router.get('/todos', requireAuth('STUDENT'), studentCtrl.getTodos);

/**
 * PUT /api/student/todos
 * Update/save the full list of todo items
 */
router.put('/todos', requireAuth('STUDENT'), studentCtrl.updateTodos);

/**
 * POST /api/student/todos/generate
 * Generate study recommendations using AI
 */
router.post('/todos/generate', requireAuth('STUDENT'), studentCtrl.generateAiTodos);

module.exports = router;
