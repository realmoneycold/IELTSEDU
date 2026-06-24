// ═══════════════════════════════════════════════════════════════
// Dashboard Routes - IELTSPRACTICE
// Aggregated endpoints for student dashboard
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const dashboardCtrl = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/unified-auth');
const { verifyToken, checkRole } = require('../middleware/auth');
const prisma = require('../models/prisma');

// ═══════════════════════════════════════════════════════════════
// MAIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/student/dashboard/full
 * Get comprehensive dashboard data including profile, stats, progress, leaderboard, centres
 */
router.get('/full', requireAuth('STUDENT'), dashboardCtrl.getFullDashboardData);

/**
 * GET /api/student/dashboard/stats
 * Get quick statistics summary
 */
router.get('/stats', requireAuth('STUDENT'), dashboardCtrl.getDashboardStats);

// ═══════════════════════════════════════════════════════════════
// PRACTICE TEST CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/student/practice/listening
 * Get listening practice tests
 * Query: ?part=Full&set=1
 */
router.get('/practice/listening', requireAuth('STUDENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { part = 'Full', set } = req.query;

    const where = {
      testType: 'LISTENING',
      isPublished: true
    };

    if (part) {
      where.focusArea = part;
    }

    const tests = await prisma.practiceTest.findMany({
      where,
      include: {
        results: {
          where: { userId },
          select: {
            score: true,
            bandScore: true,
            isCompleted: true,
            completedAt: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: tests
    });

  } catch (error) {
    console.error('Get listening practice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch listening practice',
      code: 'PRACTICE_FETCH_ERROR'
    });
  }
});

/**
 * GET /api/student/practice/reading
 * Get reading practice tests
 */
router.get('/practice/reading', requireAuth('STUDENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { part = 'All Passages', set } = req.query;

    const tests = await prisma.practiceTest.findMany({
      where: {
        testType: 'READING',
        isPublished: true,
        focusArea: part
      },
      include: {
        results: {
          where: { userId },
          select: {
            score: true,
            bandScore: true,
            isCompleted: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: tests
    });

  } catch (error) {
    console.error('Get reading practice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reading practice',
      code: 'PRACTICE_FETCH_ERROR'
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// CENTRES CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/student/centres
 * Get all education centres with filtering
 * Query: ?city=Tashkent&type=Official&search=British
 */
router.get('/centres', async (req, res) => {
  try {
    const { city, type, search } = req.query;

    const where = { isActive: true };

    if (city) {
      where.city = city;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } }
      ];
    }

    const centres = await prisma.educationCentre.findMany({
      where,
      select: {
        id: true,
        name: true,
        city: true,
        district: true,
        address: true,
        contactEmail: true,
        contactPhone: true,
        websiteUrl: true,
        rating: true,
        totalStudents: true,
        isActive: true
      },
      orderBy: { rating: 'desc' }
    });

    const formattedCentres = centres.map(c => ({
      id: c.id,
      name: c.name,
      city: c.city,
      type: type || 'Official',
      rating: c.rating || 0,
      address: c.address || '',
      contactEmail: c.contactEmail || '',
      contactPhone: c.contactPhone || '',
      websiteUrl: c.websiteUrl || '',
      isOpen: c.isActive,
      totalStudents: c.totalStudents
    }));

    res.json({
      success: true,
      data: formattedCentres,
      total: formattedCentres.length
    });

  } catch (error) {
    console.error('Get centres error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch centres',
      code: 'CENTRES_FETCH_ERROR'
    });
  }
});

/**
 * GET /api/student/centres/:id
 * Get single centre by ID
 */
router.get('/centres/:id', async (req, res) => {
  try {
    const centre = await prisma.educationCentre.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        district: true,
        address: true,
        contactEmail: true,
        contactPhone: true,
        websiteUrl: true,
        rating: true,
        totalStudents: true,
        activeStudents: true,
        isActive: true,
        mockSessions: {
          where: { dateTime: { gte: new Date() } },
          orderBy: { dateTime: 'asc' },
          take: 5,
          select: {
            id: true,
            dateTime: true,
            type: true,
            format: true,
            location: true,
            capacity: true,
            price: true
          }
        }
      }
    });

    if (!centre) {
      return res.status(404).json({
        success: false,
        error: 'Centre not found',
        code: 'CENTRE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: centre
    });

  } catch (error) {
    console.error('Get centre error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch centre',
      code: 'CENTRE_FETCH_ERROR'
    });
  }
});

/**
 * POST /api/student/centres/inquiry
 * Submit inquiry to a centre
 * Body: { centreId, studentName, studentEmail, message }
 */
router.post('/centres/inquiry', requireAuth('STUDENT'), async (req, res) => {
  try {
    const { centreId, studentName, studentEmail, message } = req.body;

    if (!centreId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Centre ID and message are required',
        code: 'MISSING_FIELDS'
      });
    }

    const student = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const inquiry = await prisma.inquiry.create({
      data: {
        centreId: parseInt(centreId),
        studentName: studentName || student.full_name,
        studentEmail: studentEmail || student.email,
        message
      }
    });

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully',
      data: inquiry
    });

  } catch (error) {
    console.error('Submit inquiry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit inquiry',
      code: 'INQUIRY_ERROR'
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// LEADERBOARD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/student/leaderboard
 * Get global leaderboard
 * Query: ?limit=10&scope=global|centre
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 10, scope = 'global' } = req.query;

    let where = { role: 'STUDENT', isActive: true };

    // If scope is centre, filter by centre (would need centre context)
    // For now, return global leaderboard

    const leaderboard = await prisma.user.findMany({
      where,
      select: {
        id: true,
        full_name: true,
        current_band: true,
        target_band: true,
        study_hours: true,
        tasks_done: true,
        centre: {
          select: {
            id: true,
            name: true,
            city: true
          }
        }
      },
      orderBy: { current_band: 'desc' },
      take: parseInt(limit)
    });

    const rankedLeaderboard = leaderboard.map((u, index) => ({
      rank: index + 1,
      id: u.id,
      fullName: u.full_name,
      currentBand: u.current_band,
      targetBand: u.target_band,
      studyHours: u.study_hours,
      tasksDone: u.tasks_done,
      centre: u.centre
    }));

    res.json({
      success: true,
      data: rankedLeaderboard
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard',
      code: 'LEADERBOARD_ERROR'
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// MOCK SESSIONS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/student/mock-sessions
 * Get upcoming mock test sessions
 * Query: ?city=Tashkent&limit=10
 */
router.get('/mock-sessions', requireAuth('STUDENT'), async (req, res) => {
  try {
    const { city, limit = 10 } = req.query;

    const where = {
      dateTime: { gte: new Date() }
    };

    const sessions = await prisma.mockSession.findMany({
      where,
      include: {
        centre: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true
          }
        },
        results: {
          where: { studentId: req.user.id },
          select: {
            id: true,
            overall: true
          }
        }
      },
      orderBy: { dateTime: 'asc' },
      take: parseInt(limit)
    });

    const formattedSessions = sessions.map(s => ({
      id: s.id,
      dateTime: s.dateTime,
      type: s.type,
      format: s.format,
      location: s.location,
      capacity: s.capacity,
      price: s.price,
      centre: s.centre,
      hasParticipated: s.results.length > 0,
      lastScore: s.results[0]?.overall || null
    }));

    res.json({
      success: true,
      data: formattedSessions
    });

  } catch (error) {
    console.error('Get mock sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mock sessions',
      code: 'MOCK_SESSIONS_ERROR'
    });
  }
});

module.exports = router;
