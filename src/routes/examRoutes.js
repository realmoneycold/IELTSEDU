// ═══════════════════════════════════════════════════════════════
// examRoutes.js — Exam & Test Statistics Routes
// Mounted at: /api/exams
// ═══════════════════════════════════════════════════════════════

'use strict';

const express  = require('express');
const router   = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth');
const examCtrl = require('../controllers/examController');

// ─── GET /api/exams/weekly ───────────────────────────────────────────────────
/**
 * Weekly exam statistics.
 * Any authenticated user can call this (students see own data; admins see all).
 *
 * Query: ?weeks=8
 */
router.get('/weekly', verifyToken, examCtrl.getWeeklyStats);

// ─── GET /api/exams/centres ──────────────────────────────────────────────────
/**
 * List of education centres that offer IELTS exams.
 * Public-ish: any authenticated user may browse exam centres.
 *
 * Query: ?page=1&limit=20&city=Tashkent&search=Oxford
 */
router.get('/centres', verifyToken, examCtrl.getExamCentres);

// ─── POST /api/exams/book ────────────────────────────────────────────────────
/**
 * Book a mock exam session.
 * Only STUDENT role can book.
 *
 * Body: { sessionId: number }
 */
router.post(
  '/book',
  verifyToken,
  checkRole('STUDENT'),
  examCtrl.bookExam
);

module.exports = router;
