/**
 * AI Routes
 * IELTS Writing Assessment & Mentoring via Groq AI
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { requireAuth } = require('../middleware/unified-auth');

// ═══════════════════════════════════════════════════════════════
// All routes require student authentication
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/ai/assess-writing
 * Assess IELTS writing sample
 * Body: { writing: string, taskType?: 'Task1' | 'Task2' }
 */
router.post('/assess-writing', requireAuth('STUDENT'), aiController.assessWriting);

/**
 * POST /api/ai/assess-speaking
 * Assess IELTS speaking response
 * Body: { speakingText: string, partType?: 'Part1' | 'Part2' | 'Part3' | 'Full', questionPrompt?: string }
 */
router.post('/assess-speaking', requireAuth('STUDENT'), aiController.assessSpeaking);

/**
 * POST /api/ai/mentor
 * Get AI mentoring response
 * Body: { question: string }
 */
router.post('/mentor', requireAuth('STUDENT'), aiController.getMentoring);

/**
 * GET /api/ai/tips
 * Get personalized writing tips
 * Query: ?weakAreas=grammar,vocabulary
 */
router.get('/tips', requireAuth('STUDENT'), aiController.getWritingTips);

/**
 * GET /api/ai/chat-history
 * Get AI chat history
 * Query: ?page=1&limit=20
 */
router.get('/chat-history', requireAuth('STUDENT'), aiController.getChatHistory);

/**
 * GET /api/ai/assessments
 * Get writing assessment history
 * Query: ?page=1&limit=20
 */
router.get('/assessments', requireAuth('STUDENT'), aiController.getAssessmentHistory);

/**
 * GET /api/ai/status
 * Check AI service availability
 */
router.get('/status', aiController.checkAIStatus);

module.exports = router;
