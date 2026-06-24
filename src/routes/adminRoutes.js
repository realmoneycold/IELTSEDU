// ═════════════════════════════════════════════════════════════════════════
// routes/admin.js  — IELTSPRACTICE Admin Operations API v2
//
// Mount in app.js:
//   const adminRoutes = require('./routes/admin');
//   app.use('/api/admin', adminRoutes);
//
// All routes are protected by JWT authentication requiring ADMIN or CEO role
// ═════════════════════════════════════════════════════════════════════════

'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const prisma = require('../models/prisma');
const adminCtrl = require('../controllers/adminController');

// Initialise Gemini AI for AI-powered features
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// ─── MIDDLEWARE: requireStaff ───────────────────────────────────────────────
// Validates Bearer JWT and checks role is ADMIN or CEO
function requireStaff(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!['ADMIN', 'CEO'].includes(decoded.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions — ADMIN or CEO role required'
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    return res.status(500).json({ success: false, error: 'Authentication error' });
  }
}

// Apply middleware to all admin routes
router.use(requireStaff);

// ═══════════════════════════════════════════════════════════════
// DASHBOARD & ANALYTICS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/stats
 * Get dashboard statistics for current admin
 */
router.get('/stats', adminCtrl.getDashboardStats);

/**
 * GET /api/admin/analytics/signups
 * Signup trends for Growth chart
 * Query: ?period=daily|weekly|monthly
 */
router.get('/analytics/signups', async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;

    let trunc;
    if (period === 'daily') trunc = 'day';
    else if (period === 'weekly') trunc = 'week';
    else trunc = 'month';

    const rows = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC(${trunc}::text, "createdAt") AS period,
        COUNT(*) AS count
      FROM "User"
      GROUP BY 1
      ORDER BY 1 ASC
      LIMIT 24
    `;

    res.json({
      success: true,
      data: rows.map(r => ({ period: r.period, count: Number(r.count) }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/analytics/regions
 * User count grouped by city/region
 */
router.get('/analytics/regions', async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT city, COUNT(*) AS count
      FROM "User"
      WHERE city IS NOT NULL
      GROUP BY city
      ORDER BY count DESC
      LIMIT 10
    `;

    res.json({
      success: true,
      data: rows.map(r => ({ city: r.city, count: Number(r.count) }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// AI INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/admin/ai-parse
 * Uses Gemini AI to extract questions from raw text
 * Body: { text: "raw practice test content" }
 */
router.post('/ai-parse', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, error: 'Text is required' });
  }

  try {
    const prompt = `
You are an IELTS practice test question extractor. Extract questions from the following text and return a structured JSON array.

Requirements:
1. Each question must have: questionText, type (MULTIPLE_CHOICE/FILL_BLANKS/TRUE_FALSE), correctAnswer, options (array for MC only)
2. For multiple choice: include all options in the options array
3. For fill-in-the-blanks: set options to null
4. For true/false: set options to ["true", "false"]
5. Return ONLY valid JSON array, no explanations

Text to process:
${text}

Expected format:
[
  {
    "questionText": "What is the capital of France?",
    "type": "MULTIPLE_CHOICE",
    "correctAnswer": "Paris",
    "options": ["Paris", "London", "Berlin", "Madrid"]
  }
]
`;

    const result = await geminiModel.generateContent(prompt);
    const response = result.response.text();

    // Clean up response and parse JSON
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ success: false, error: 'Failed to parse AI response' });
    }

    const questions = JSON.parse(jsonMatch[0]);
    res.json({ success: true, data: questions });
  } catch (err) {
    console.error('AI Parse Error:', err);
    res.status(500).json({ success: false, error: 'AI parsing failed' });
  }
});

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET    /api/admin/users              - List all users with pagination
 * POST   /api/admin/users              - Create new user
 */
router.route('/users')
  .get(adminCtrl.getAllUsers)
  .post(adminCtrl.createUser);

/**
 * GET    /api/admin/users/:id          - Get single user
 * PUT    /api/admin/users/:id          - Update user
 * DELETE /api/admin/users/:id          - Delete user
 */
router.route('/users/:id')
  .get(adminCtrl.getUserById)
  .put(adminCtrl.updateUser)
  .delete(adminCtrl.deleteUser);

/**
 * PATCH /api/admin/users/:id/reset-password
 * Admin reset password for a user
 */
router.patch('/users/:id/reset-password', adminCtrl.resetUserPassword);

// ═══════════════════════════════════════════════════════════════
// EDUCATION CENTRES CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET    /api/admin/centres            - List all education centres
 * POST   /api/admin/centres            - Create new centre
 */
router.route('/centres')
  .get(adminCtrl.getAllCentres)
  .post(adminCtrl.createCentre);

/**
 * GET    /api/admin/centres/:id        - Get single centre
 * PUT    /api/admin/centres/:id        - Update centre
 * DELETE /api/admin/centres/:id        - Delete centre
 */
router.route('/centres/:id')
  .get(adminCtrl.getCentreById)
  .put(adminCtrl.updateCentre)
  .delete(adminCtrl.deleteCentre);

// ═══════════════════════════════════════════════════════════════
// PRACTICE TESTS CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET    /api/admin/tests              - List all practice tests
 * POST   /api/admin/tests              - Create new test with questions
 */
router.route('/tests')
  .get(adminCtrl.getAllTests)
  .post(adminCtrl.createTest);

/**
 * GET    /api/admin/tests/:id          - Get single test with questions
 * PUT    /api/admin/tests/:id          - Update test
 * DELETE /api/admin/tests/:id          - Delete test
 */
router.route('/tests/:id')
  .get(adminCtrl.getTestById)
  .put(adminCtrl.updateTest)
  .delete(adminCtrl.deleteTest);

// ═══════════════════════════════════════════════════════════════
// QUESTIONS CRUD (nested under tests)
// ═══════════════════════════════════════════════════════════════

/**
 * GET    /api/admin/tests/:testId/questions     - List questions for a test
 * POST   /api/admin/tests/:testId/questions     - Add question to test
 */
router.route('/tests/:testId/questions')
  .get(adminCtrl.getQuestionsByTest)
  .post(adminCtrl.createQuestion);

/**
 * GET    /api/admin/questions/:id      - Get single question
 * PUT    /api/admin/questions/:id      - Update question
 * DELETE /api/admin/questions/:id      - Delete question
 */
router.route('/questions/:id')
  .get((req, res) => res.status(501).json({ error: 'Use /tests/:testId/questions instead' }))
  .put(adminCtrl.updateQuestion)
  .delete(adminCtrl.deleteQuestion);

// ═══════════════════════════════════════════════════════════════
// REPORTS CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET    /api/admin/reports            - List all reports
 */
router.route('/reports')
  .get(adminCtrl.getAllReports);

/**
 * GET    /api/admin/reports/:id        - Get single report
 * DELETE /api/admin/reports/:id        - Delete report
 */
router.route('/reports/:id')
  .get(adminCtrl.getReportById)
  .delete(adminCtrl.deleteReport);

/**
 * PATCH /api/admin/reports/:id/resolve - Resolve a report
 * PATCH /api/admin/reports/:id/status  - Update report status
 */
router.patch('/reports/:id/resolve', adminCtrl.resolveReport);
router.patch('/reports/:id/status', adminCtrl.updateReportStatus);

// ═══════════════════════════════════════════════════════════════
// ADMIN TASKS CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET    /api/admin/tasks              - Get tasks for current admin
 * POST   /api/admin/tasks              - Create new task
 */
router.route('/tasks')
  .get(adminCtrl.getAdminTasks)
  .post(adminCtrl.createAdminTask);

/**
 * PATCH /api/admin/tasks/:id/toggle    - Toggle task completion
 * DELETE /api/admin/tasks/:id          - Delete task
 */
router.patch('/tasks/:id/toggle', adminCtrl.toggleTask);
router.delete('/tasks/:id', adminCtrl.deleteAdminTask);

// ═══════════════════════════════════════════════════════════════
// STRATEGIC GOALS CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET    /api/admin/goals              - List all strategic goals (kanban)
 * POST   /api/admin/goals              - Create new goal
 */
router.route('/goals')
  .get(adminCtrl.getAllGoals)
  .post(adminCtrl.createGoal);

/**
 * PATCH /api/admin/goals/:id           - Update goal (move column, etc)
 * DELETE /api/admin/goals/:id          - Delete goal
 */
router.patch('/goals/:id', adminCtrl.updateGoal);
router.delete('/goals/:id', adminCtrl.deleteGoal);

// ═══════════════════════════════════════════════════════════════
// PROFILE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/profile
 * Get current admin profile
 */
router.get('/profile', async (req, res) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true
      }
    });

    res.json({ success: true, data: admin });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/admin/profile
 * Update admin profile (name, phone, password)
 */
router.patch('/profile', async (req, res) => {
  const { full_name, phone, password } = req.body;
  const updateData = {};

  try {
    if (full_name) updateData.full_name = full_name;
    if (phone) updateData.phone = phone;
    if (password && password.length >= 8) {
      const bcrypt = require('bcryptjs');
      updateData.password = await bcrypt.hash(password, 10);
    }

    const admin = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });

    // Remove sensitive data from response
    const { password: _, ...safeAdmin } = admin;
    res.json({ success: true, data: safeAdmin });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
