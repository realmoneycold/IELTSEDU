// ═══════════════════════════════════════════════════════════════
// examController.js — Exam & Test Statistics API
// Provides real exam data for student dashboard exam stat cards
// ═══════════════════════════════════════════════════════════════

'use strict';

const prisma = require('../models/prisma');

// ─── GET /api/exams/weekly ────────────────────────────────────────────────────
/**
 * Returns weekly exam statistics (mock exam results grouped by week).
 * Replaces hardcoded exam stats in dashboard.html.
 *
 * Query params:
 *   weeks (int, default 8) – number of past weeks to return
 *
 * Auth: Any authenticated user. If role = STUDENT, scoped to that user.
 *       If role = ADMIN/CEO/CENTRE, returns platform-wide stats.
 */
async function getWeeklyStats(req, res) {
  try {
    const { weeks = 8 } = req.query;
    const numWeeks = Math.min(parseInt(weeks) || 8, 52); // cap at 52 weeks
    const role = String(req.user.role || '').toUpperCase();
    const userId = req.user.id;

    const since = new Date(Date.now() - numWeeks * 7 * 24 * 60 * 60 * 1000);

    // Scope filter: students see only their own data
    const resultWhere =
      role === 'STUDENT'
        ? { studentId: userId, createdAt: { gte: since } }
        : { createdAt: { gte: since } };

    // Fetch raw results
    const results = await prisma.mockResult.findMany({
      where: resultWhere,
      select: {
        overall:   true,
        listening: true,
        reading:   true,
        writing:   true,
        speaking:  true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group into ISO-week buckets
    const weekMap = {};

    results.forEach(r => {
      const d = new Date(r.createdAt);
      // Compute week start (Monday)
      const dayOfWeek = (d.getDay() + 6) % 7; // 0 = Mon
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      const key = weekStart.toISOString().split('T')[0];

      if (!weekMap[key]) {
        weekMap[key] = {
          weekStart: key,
          count:        0,
          totalOverall: 0,
          totalListening: 0,
          totalReading: 0,
          totalWriting: 0,
          totalSpeaking: 0
        };
      }

      weekMap[key].count++;
      if (r.overall   != null) weekMap[key].totalOverall   += r.overall;
      if (r.listening != null) weekMap[key].totalListening += r.listening;
      if (r.reading   != null) weekMap[key].totalReading   += r.reading;
      if (r.writing   != null) weekMap[key].totalWriting   += r.writing;
      if (r.speaking  != null) weekMap[key].totalSpeaking  += r.speaking;
    });

    const weekly = Object.values(weekMap).map(w => ({
      weekStart:     w.weekStart,
      examsCount:    w.count,
      avgOverall:    w.count > 0 ? parseFloat((w.totalOverall   / w.count).toFixed(2)) : 0,
      avgListening:  w.count > 0 ? parseFloat((w.totalListening / w.count).toFixed(2)) : 0,
      avgReading:    w.count > 0 ? parseFloat((w.totalReading   / w.count).toFixed(2)) : 0,
      avgWriting:    w.count > 0 ? parseFloat((w.totalWriting   / w.count).toFixed(2)) : 0,
      avgSpeaking:   w.count > 0 ? parseFloat((w.totalSpeaking  / w.count).toFixed(2)) : 0
    }));

    // Summary
    const totalExams = results.length;
    const overallScores = results.filter(r => r.overall != null).map(r => r.overall);
    const avgScore =
      overallScores.length > 0
        ? parseFloat((overallScores.reduce((s, v) => s + v, 0) / overallScores.length).toFixed(2))
        : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalExams,
          avgScore,
          weeks:  numWeeks
        },
        weekly
      }
    });
  } catch (error) {
    console.error('getWeeklyStats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly exam statistics',
      code: 'EXAM_WEEKLY_ERROR'
    });
  }
}

// ─── GET /api/exams/centres ───────────────────────────────────────────────────
/**
 * Returns a paginated list of education centres that offer IELTS exams.
 * Includes upcoming session counts to show availability.
 *
 * Query params:
 *   page   (int, default 1)
 *   limit  (int, default 20)
 *   city   (string) – filter by city
 *   search (string) – search by name or code
 */
async function getExamCentres(req, res) {
  try {
    const { page = 1, limit = 20, city = '', search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { isActive: true };

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [centres, total] = await Promise.all([
      prisma.educationCentre.findMany({
        where,
        select: {
          id:           true,
          name:         true,
          code:         true,
          city:         true,
          district:     true,
          address:      true,
          contactEmail: true,
          contactPhone: true,
          websiteUrl:   true,
          rating:       true,
          _count: {
            select: {
              mockSessions: true,
              studyGroups:  true
            }
          },
          // Include upcoming mock sessions count
          mockSessions: {
            where: { dateTime: { gte: new Date() } },
            select: {
              id:       true,
              dateTime: true,
              type:     true,
              format:   true,
              capacity: true,
              price:    true
            },
            orderBy: { dateTime: 'asc' },
            take: 3   // next 3 upcoming sessions per centre
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.educationCentre.count({ where })
    ]);

    // Add upcomingSessionCount convenience field
    const enriched = centres.map(c => ({
      ...c,
      upcomingSessionCount: c.mockSessions.length,
      nextSession: c.mockSessions[0] || null
    }));

    res.json({
      success: true,
      data: {
        centres: enriched,
        pagination: {
          page:  parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('getExamCentres error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exam centres',
      code: 'EXAM_CENTRES_ERROR'
    });
  }
}

// ─── POST /api/exams/book ─────────────────────────────────────────────────────
/**
 * Books a student into a mock exam session at an education centre.
 * Creates a MockResult record (score fields null until result is entered).
 *
 * Body:
 *   sessionId (int, required) – ID of the MockSession to book
 *
 * Auth: STUDENT role required
 */
async function bookExam(req, res) {
  try {
    const studentId = req.user.id;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required',
        code: 'MISSING_SESSION_ID'
      });
    }

    const session = await prisma.mockSession.findUnique({
      where: { id: parseInt(sessionId) },
      include: {
        _count: { select: { results: true } }
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Exam session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    // Check if session is in the future
    if (new Date(session.dateTime) <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot book a past exam session',
        code: 'SESSION_EXPIRED'
      });
    }

    // Check capacity
    if (session._count.results >= session.capacity) {
      return res.status(409).json({
        success: false,
        error: 'Exam session is fully booked',
        code: 'SESSION_FULL'
      });
    }

    // Check if already booked
    const existing = await prisma.mockResult.findFirst({
      where: { studentId, sessionId: parseInt(sessionId) }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'You have already booked this exam session',
        code: 'ALREADY_BOOKED'
      });
    }

    // Create booking (scores left null until exam is taken)
    const booking = await prisma.mockResult.create({
      data: {
        studentId,
        sessionId: parseInt(sessionId)
      },
      include: {
        session: {
          select: {
            id:       true,
            dateTime: true,
            type:     true,
            format:   true,
            location: true,
            price:    true,
            centre: {
              select: { name: true, city: true, address: true }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Exam session booked successfully',
      data: booking
    });
  } catch (error) {
    console.error('bookExam error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to book exam session',
      code: 'EXAM_BOOK_ERROR'
    });
  }
}

module.exports = {
  getWeeklyStats,
  getExamCentres,
  bookExam
};
