// ═══════════════════════════════════════════════════════════════════════════
// routes/admin.js  — IELTSPRACTICE Admin Operations API  v2
//
// Mount in app.js:
//   const adminRoutes = require('./routes/admin');
//   app.use('/api/admin', adminRoutes);   // JWT auth applied inside
//
// Install dependencies:
//   npm install @google/generative-ai jsonwebtoken bcryptjs
//
// Required environment variables:
//   GEMINI_API_KEY=your_key_here
//   JWT_SECRET=your_jwt_secret
// ═══════════════════════════════════════════════════════════════════════════

'use strict';

const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const prisma = new PrismaClient();

// Initialise Gemini AI
const genAI       = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });


// ─── MIDDLEWARE: requireStaff ─────────────────────────────────────────────────
// Validates Bearer JWT and checks role is ADMIN or CEO.
// Sets req.user = { id, email, role, name } on success.
// ALL /api/admin/* routes are protected by this middleware.
function requireStaff(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!['ADMIN', 'CEO'].includes(decoded.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions — ADMIN or CEO role required' });
    }

    req.user = decoded; // { id, email, role, name }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

// Apply auth to ALL routes in this router
router.use(requireStaff);


// ═══════════════════════════════════════════════════════════════════════════
// AI PARSE
// POST /api/admin/ai-parse
// Body: { text: string }
// Returns: { success, questions: [{questionText, type, options, correctAnswer}] }
// ═══════════════════════════════════════════════════════════════════════════
router.post('/ai-parse', async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return res.status(400).json({
      success: false,
      error: 'Please provide text to parse (min 10 characters).',
    });
  }

  const SYSTEM_PROMPT = `You are an IELTS data extraction API. Extract all questions from the provided raw IELTS test text.

Rules:
- For Matching Headings: map each paragraph letter (A, B, C…) to the correct heading option. Create one question per paragraph.
- For True/False/Not Given or Yes/No/Not Given: use type "true_false", correctAnswer is "True", "False", or "Not Given".
- For Multiple Choice with 4 options: use type "multiple_choice", options array ["A text","B text","C text","D text"], correctAnswer is "A", "B", "C", or "D".
- For fill-in-the-blank / short answer: use type "fill_blanks", options null, correctAnswer is the answer string.

Return ONLY a valid JSON array with NO markdown, no preamble, no backticks. Each object must have exactly:
{
  "questionText": "string",
  "type": "multiple_choice" | "fill_blanks" | "true_false",
  "options": ["string"] | null,
  "correctAnswer": "string"
}`;

  try {
    const result = await geminiModel.generateContent([
      { text: SYSTEM_PROMPT },
      { text: `Extract all questions from this IELTS content:\n\n${text}` },
    ]);

    const rawText = result.response.text();

    // Strip markdown code fences
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let questions;
    try {
      questions = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('AI response was not valid JSON. Please try with cleaner input text.');
      questions = JSON.parse(match[0]);
    }

    if (!Array.isArray(questions)) throw new Error('Expected a JSON array of questions from AI.');

    const validTypes = ['multiple_choice', 'fill_blanks', 'true_false'];
    const sanitised  = questions.map((q, i) => ({
      questionText:  String(q.questionText  || `Question ${i + 1}`).trim(),
      type:          validTypes.includes(q.type) ? q.type : 'multiple_choice',
      options:       Array.isArray(q.options) ? q.options.map(String) : null,
      correctAnswer: String(q.correctAnswer || '').trim(),
    }));

    return res.json({ success: true, questions: sanitised });

  } catch (err) {
    console.error('[AI Parse Error]', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'AI parsing failed. Please try again.',
    });
  }
});


// ═══════════════════════════════════════════════════════════════════════════
// PRACTICE TESTS
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/admin/tests — Create a new practice test with questions
router.post('/tests', async (req, res) => {
  const {
    title, duration, testType, practiceMode, focusArea,
    instructions, passage, questions = [],
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, error: 'title is required' });
  }

  const typeMap  = { Reading:'READING', Listening:'LISTENING', Writing:'WRITING', Speaking:'SPEAKING' };
  const modeMap  = { FULL:'FULL', PARTIAL:'PARTIAL' };
  const qtypeMap = { multiple_choice:'MULTIPLE_CHOICE', fill_blanks:'FILL_BLANKS', true_false:'TRUE_FALSE' };

  try {
    const test = await prisma.$transaction(async (tx) => {
      const newTest = await tx.practiceTest.create({
        data: {
          title:        title.trim(),
          testType:     typeMap[testType]      || 'READING',
          practiceMode: modeMap[practiceMode]  || 'FULL',
          focusArea:    focusArea              || null,
          durationMins: parseInt(duration)     || 60,
          instructions: instructions           || null,
          passage:      passage                || null,
          createdById:  req.user.id,
        },
      });

      if (questions.length > 0) {
        await tx.question.createMany({
          data: questions.map((q, idx) => ({
            testId:        newTest.id,
            questionText:  q.questionText || '',
            type:          qtypeMap[q.type] || 'MULTIPLE_CHOICE',
            options:       Array.isArray(q.options) ? q.options : null,
            correctAnswer: q.correctAnswer || '',
            orderIndex:    idx,
          })),
        });
      }

      return newTest;
    });

    return res.status(201).json({
      success: true,
      data: { id: test.id, title: test.title, questionCount: questions.length },
    });

  } catch (err) {
    console.error('[Save Test Error]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/tests — List all tests (with question count)
router.get('/tests', async (req, res) => {
  try {
    const where = { isArchived: false };
    if (req.query.type) where.testType = req.query.type.toUpperCase();
    if (req.query.mode) where.practiceMode = req.query.mode.toUpperCase();

    const tests = await prisma.practiceTest.findMany({
      where,
      include: {
        _count:    { select: { questions: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: tests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/tests/:id — Single test with all questions
router.get('/tests/:id', async (req, res) => {
  try {
    const test = await prisma.practiceTest.findUnique({
      where:   { id: parseInt(req.params.id) },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!test) return res.status(404).json({ success: false, error: 'Test not found' });
    res.json({ success: true, data: test });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/tests/:id — Soft-archive
router.delete('/tests/:id', async (req, res) => {
  try {
    await prisma.practiceTest.update({
      where: { id: parseInt(req.params.id) },
      data:  { isArchived: true },
    });
    res.json({ success: true, message: 'Test archived' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ═══════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/reports — List reports (filter by ?status=OPEN&type=CONTENT_ERROR)
router.get('/reports', async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status.toUpperCase();
  if (req.query.type)   where.type   = req.query.type.toUpperCase();

  try {
    const reports = await prisma.report.findMany({
      where,
      include: {
        student:  { select: { id: true, name: true, email: true } },
        test:     { select: { id: true, title: true, testType: true } },
        question: { select: { id: true, questionText: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/reports/:id — Update status / add resolution note
router.patch('/reports/:id', async (req, res) => {
  const { status, resolutionNote } = req.body;
  try {
    const report = await prisma.report.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(status         && { status: status.toUpperCase() }),
        ...(resolutionNote && { resolutionNote }),
        ...(status === 'RESOLVED' && {
          resolvedById: req.user.id,
          resolvedAt:   new Date(),
        }),
      },
    });
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ═══════════════════════════════════════════════════════════════════════════
// TASK LIST
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/my-tasks — Tasks for the logged-in admin (today's by default)
router.get('/my-tasks', async (req, res) => {
  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  try {
    const tasks = await prisma.adminTask.findMany({
      where: {
        adminId:      req.user.id,
        assignedDate: { gte: today, lt: tomorrow },
      },
      orderBy: [{ isDone: 'asc' }, { priority: 'asc' }],
    });

    const done  = tasks.filter(t => t.isDone).length;
    const total = tasks.length;
    const pct   = total > 0 ? Math.round(done / total * 100) : 0;

    res.json({ success: true, data: tasks, progress: { done, total, pct } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/my-tasks/:id/toggle — Toggle isDone
router.patch('/my-tasks/:id/toggle', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const task = await prisma.adminTask.findUnique({ where: { id } });
    if (!task)             return res.status(404).json({ success: false, error: 'Task not found' });
    if (task.adminId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not your task' });
    }

    const updated = await prisma.adminTask.update({
      where: { id },
      data:  {
        isDone: !task.isDone,
        status: !task.isDone ? 'done' : 'pending',
        doneAt: !task.isDone ? new Date() : null,
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/notifications — Latest 20 notifications
router.get('/notifications', async (req, res) => {
  try {
    const notifs = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const unreadCount = notifs.filter(n => !n.isRead).length;
    res.json({ success: true, data: notifs, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/notifications/:id/read — Mark single notification as read
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: parseInt(req.params.id) },
      data:  { isRead: true, readAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/notifications/read-all — Mark all notifications as read
router.patch('/notifications/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { isRead: false },
      data:  { isRead: true, readAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ═══════════════════════════════════════════════════════════════════════════
// PROFILE UPDATE
// PATCH /api/admin/profile
// Body: { firstName?, lastName?, password? }
// ═══════════════════════════════════════════════════════════════════════════
router.patch('/profile', async (req, res) => {
  const { firstName, lastName, password } = req.body;
  const updateData = {};

  if (firstName || lastName) {
    const currentAdmin = await prisma.admin.findUnique({ where: { id: req.user.id } });
    const parts        = (currentAdmin.name || '').split(' ');
    updateData.name    = `${firstName || parts[0] || ''} ${lastName || parts[1] || ''}`.trim();
  }

  if (password) {
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
    }
    updateData.passwordHash = await bcrypt.hash(password, 12);
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ success: false, error: 'No fields to update.' });
  }

  try {
    const updated = await prisma.admin.update({
      where:  { id: req.user.id },
      data:   updateData,
      select: { id: true, name: true, email: true, role: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


module.exports = router;
