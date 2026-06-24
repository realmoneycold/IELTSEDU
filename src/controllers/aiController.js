/**
 * AI Controller
 * Handles IELTS writing assessment and mentoring via Groq AI
 */

const groqService = require('../services/groqService');
const prisma = require('../models/prisma');
const logger = require('../services/loggerService');

// ═══════════════════════════════════════════════════════════════
// WRITING ASSESSMENT
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/ai/assess-writing
 * Evaluate student's IELTS writing sample
 */
exports.assessWriting = async (req, res) => {
  try {
    const { writing, taskType = 'Task2' } = req.body;
    const studentId = req.user.id;

    if (!writing || writing.trim().length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Writing sample must be at least 50 characters',
      });
    }

    // Get student's performance history
    const studentData = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
        practiceTestResults: {
          where: { 
            OR: [
              { testCategory: 'Writing' },
              { testSubcategory: 'Writing' }
            ]
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // Build context from previous results
    const previousScores = studentData?.practiceTestResults?.map((r) => r.score) || [];
    const avgScore =
      previousScores.length > 0
        ? (previousScores.reduce((a, b) => a + b, 0) / previousScores.length).toFixed(1)
        : null;

    const context = {
      id: studentId,
      name: studentData?.name,
      currentBand: avgScore ? Math.ceil(parseFloat(avgScore)) : null,
      previousSubmissions: studentData?.practiceTestResults?.length || 0,
      taskType,
    };

    // Get AI assessment
    const assessment = await groqService.evaluateIELTSWriting(writing, context);

    // Calculate metrics for Advanced Analytics
    const wordCount = writing.trim().split(/\s+/).filter(word => word.length > 0).length;
    const grammarErrors = (assessment.errors && Array.isArray(assessment.errors)) ? assessment.errors.length : 0;
    // Simple lexical score based on number of excellent words identified
    const lexicalScore = (assessment.vocabulary && assessment.vocabulary.excellent && Array.isArray(assessment.vocabulary.excellent)) 
                          ? assessment.vocabulary.excellent.length : 0;

    // Save assessment to database
    const savedAssessment = await prisma.aIWritingAssessment.create({
      data: {
        userId: studentId,
        writingText: writing,
        taskType,
        assessment: assessment,
        overallBand: parseFloat(assessment.overallBand || 0),
        wordCount: wordCount,
        grammarErrors: grammarErrors,
        lexicalScore: lexicalScore,
      },
    });

    logger.info('Writing assessment completed', {
      userId: studentId,
      taskType,
      band: assessment.overallBand,
    });

    res.json({
      success: true,
      assessment: savedAssessment,
      message: 'Writing assessment completed successfully',
    });
  } catch (error) {
    logger.error('Error assessing writing:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    });
    console.error('[AI Assessment Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to assess writing',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// SPEAKING ASSESSMENT
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/ai/assess-speaking
 * Evaluate student's IELTS speaking response
 */
exports.assessSpeaking = async (req, res) => {
  try {
    const { speakingText, partType = 'Full', questionPrompt = '' } = req.body;
    const studentId = req.user.id;

    if (!speakingText || speakingText.trim().length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Speaking response must be at least 20 characters',
      });
    }

    // Get student's performance history
    const studentData = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const context = {
      id: studentId,
      name: studentData?.name,
    };

    // Get AI assessment
    const assessment = await groqService.evaluateIELTSSpeaking(speakingText, partType, questionPrompt, context);

    logger.info('Speaking assessment completed', {
      userId: studentId,
      partType,
      overallBand: assessment.overallBand || assessment.overallScore,
    });

    res.json({
      success: true,
      assessment,
      message: 'Speaking assessment completed successfully',
    });
  } catch (error) {
    logger.error('Error assessing speaking:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    });
    console.error('[AI Speaking Assessment Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to assess speaking',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// AI MENTORING
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/ai/mentor
 * Get AI mentoring response to student questions
 */
exports.getMentoring = async (req, res) => {
  try {
    const { question } = req.body;
    const studentId = req.user.id;

    if (!question || question.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Question must be at least 5 characters',
      });
    }

    // Get student's performance data
    const studentData = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        current_band: true,
        currentBand: true,
        target_band: true,
        targetBand: true,
        study_hours: true,
        tasks_done: true,
        exam_date: true,
        examDate: true,
        practiceTestResults: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        progressSnapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        typingRanking: true,
      },
    });

    // Calculate weak areas
    const weakAreas = [];
    if (studentData?.practiceTestResults) {
      const categories = {};
      studentData.practiceTestResults.forEach((result) => {
        if (!categories[result.category]) {
          categories[result.category] = [];
        }
        categories[result.category].push(result.score);
      });

      // Find lowest performing categories
      Object.entries(categories).forEach(([category, scores]) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avg < 6) {
          weakAreas.push(category);
        }
      });
    }

    const latestSnapshot = studentData?.progressSnapshots?.[0];

    const context = {
      id: studentId,
      name: studentData?.name,
      currentBand: studentData?.currentBand || studentData?.current_band,
      targetBand: studentData?.targetBand || studentData?.target_band,
      studyHours: studentData?.study_hours,
      tasksDone: studentData?.tasks_done,
      examDate: studentData?.examDate || studentData?.exam_date,
      overallAvg: latestSnapshot?.overallAvg,
      listeningAvg: latestSnapshot?.listeningAvg,
      readingAvg: latestSnapshot?.readingAvg,
      writingAvg: latestSnapshot?.writingAvg,
      speakingAvg: latestSnapshot?.speakingAvg,
      typingWpm: studentData?.typingRanking?.bestWpm,
      weakAreas,
      previousSubmissions: studentData?.practiceTestResults?.length || 0,
    };

    // Get mentoring response
    const mentoring = await groqService.getIELTSMentoring(question, context);

    // Save to database
    const savedChat = await prisma.aiChatSession.create({
      data: {
        userId: studentId,
        question,
        response: mentoring.response,
        category: 'GENERAL_MENTORING',
      },
    });

    logger.info('Mentoring response generated', {
      userId: studentId,
      tokens: mentoring.tokens_used,
    });

    res.json({
      success: true,
      chat: savedChat,
      message: 'Mentoring response generated',
    });
  } catch (error) {
    logger.error('Error generating mentoring response:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate mentoring',
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// WRITING TIPS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/ai/tips
 * Get personalized writing improvement tips
 */
exports.getWritingTips = async (req, res) => {
  try {
    const { weakAreas } = req.query;
    const studentId = req.user.id;

    const areas = weakAreas
      ? weakAreas.split(',').map((a) => a.trim())
      : ['grammar', 'vocabulary', 'coherence'];

    // Get student data
    const studentData = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        testResults: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    const context = {
      id: studentId,
      name: studentData?.name,
      previousSubmissions: studentData?.testResults?.length || 0,
    };

    // Get tips
    const tips = await groqService.getWritingTips(areas, context);

    // Save tips session
    const savedTips = await prisma.aiChatSession.create({
      data: {
        userId: studentId,
        question: `Writing tips for: ${areas.join(', ')}`,
        response: tips.tips,
        category: 'WRITING_TIPS',
      },
    });

    logger.info('Writing tips generated', {
      userId: studentId,
      areas,
    });

    res.json({
      success: true,
      tips: savedTips,
      weakAreas: areas,
    });
  } catch (error) {
    logger.error('Error generating writing tips:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate tips',
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// CHAT HISTORY
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/ai/chat-history
 * Get student's AI chat history
 */
exports.getChatHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const studentId = req.user.id;

    const skip = (page - 1) * limit;

    const [chats, total] = await Promise.all([
      prisma.aiChatSession.findMany({
        where: { userId: studentId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.aiChatSession.count({
        where: { userId: studentId },
      }),
    ]);

    res.json({
      success: true,
      chats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// ASSESSMENT HISTORY
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/ai/assessments
 * Get student's writing assessment history
 */
exports.getAssessmentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const studentId = req.user.id;

    const skip = (page - 1) * limit;

    const [assessments, total] = await Promise.all([
      prisma.aIWritingAssessment.findMany({
        where: { userId: studentId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.aIWritingAssessment.count({
        where: { userId: studentId },
      }),
    ]);

    res.json({
      success: true,
      assessments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching assessments:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// AI AVAILABILITY CHECK
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/ai/status
 * Check if AI features are available
 */
exports.checkAIStatus = async (req, res) => {
  try {
    const isAvailable = await groqService.isGroqAvailable();

    res.json({
      success: true,
      available: isAvailable,
      status: isAvailable ? 'AI services ready' : 'AI services unavailable',
      provider: 'Groq',
    });
  } catch (error) {
    logger.error('Error checking AI status:', error);
    res.json({
      success: false,
      available: false,
      status: 'Error checking AI status',
      error: error.message,
    });
  }
};
