// ═══════════════════════════════════════════════════════════════
// Education Centre Dashboard Routes - IELTSPRACTICE
// Protected routes for education centre administrators
// ═══════════════════════════════════════════════════════════════

'use strict';

const express = require('express');
const router = express.Router();
const prisma = require('../models/prisma');
const { verifyCentreAccess } = require('./educationAuth');
const educationCtrl = require('../controllers/educationController');

// ─── PROTECTED DASHBOARD ROUTES ─────────────────────────────────────────────────────────────
// All routes below require valid JWT with CENTRE_ADMIN role

/**
 * GET /api/education/stats
 * Get aggregated education centre statistics (replaces hardcoded dashboard zeros).
 * Returns student counts, courses, completion rate, exam sessions, and performance.
 */
router.get('/stats', verifyCentreAccess, educationCtrl.getEducationStats);

/**
 * GET /api/education/students
 * Get paginated list of students enrolled at the authenticated centre.
 * Query: ?page=1&limit=20&search=&active=true
 */
router.get('/students', verifyCentreAccess, educationCtrl.getStudentList);

/**
 * GET /api/education/dashboard
 * Get dashboard statistics for the authenticated centre
 */
router.get('/dashboard', verifyCentreAccess, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    
    // Get centre information
    const centre = await prisma.educationCentre.findUnique({
      where: { id: centreId },
      select: {
        id: true,
        name: true,
        location: true,
        code: true
      }
    });

    if (!centre) {
      return res.status(404).json({
        success: false,
        error: 'Centre not found',
        code: 'CENTRE_NOT_FOUND'
      });
    }

    // Get centre-specific statistics
    const [totalUsers, activeUsers] = await Promise.all([
      prisma.centreUser.count({
        where: { centreId, isActive: true }
      }),
      prisma.centreUser.count({
        where: { 
          centreId, 
          isActive: true,
          lastLoginAt: { not: null }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        centre,
        statistics: {
          totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers
        }
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * GET /api/education/users
 * Get all users for the authenticated centre (centre-specific filtering)
 */
router.get('/users', verifyCentreAccess, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    const { page = 1, limit = 10, search = '' } = req.query;

    const where = {
      centreId,
      isActive: true
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.centreUser.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          lastLoginAt: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.centreUser.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * POST /api/education/users
 * Create a new user for the authenticated centre
 */
router.post('/users', verifyCentreAccess, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    const { email, fullName, password, role = 'CENTRE_STAFF' } = req.body;

    // Validation
    if (!email || !fullName || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, full name, and password are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Check if email already exists in this centre
    const existingUser = await prisma.centreUser.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        centreId
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'A user with this email already exists in this centre',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.centreUser.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        fullName: fullName.trim(),
        role,
        centreId
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// ─── MOCK SESSIONS ─────────────────────────────────────────────────────────────
/**
 * GET /api/education/mock-sessions
 * Get all mock sessions for the authenticated centre
 */
router.get('/mock-sessions', verifyCentreAccess, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    const { page = 1, limit = 10 } = req.query;

    const sessions = await prisma.mockSession.findMany({
      where: { centreId },
      orderBy: { dateTime: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const total = await prisma.mockSession.count({ where: { centreId } });

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get mock sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * POST /api/education/mock-sessions
 * Create a new mock session
 */
router.post('/mock-sessions', verifyCentreAccess, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    const { dateTime, type, format, location, capacity, price, notes } = req.body;

    // Validation
    if (!dateTime || !type || !format) {
      return res.status(400).json({
        success: false,
        error: 'Date time, type, and format are required',
        code: 'MISSING_FIELDS'
      });
    }

    const session = await prisma.mockSession.create({
      data: {
        centreId,
        dateTime: new Date(dateTime),
        type,
        format,
        location: location || '',
        capacity: capacity ? parseInt(capacity) : null,
        price: price ? parseFloat(price) : null,
        notes: notes || ''
      }
    });

    res.status(201).json({
      success: true,
      message: 'Mock session created successfully',
      data: session
    });
  } catch (error) {
    console.error('Create mock session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * PUT /api/education/mock-sessions/:id
 * Update a mock session
 */
router.put('/mock-sessions/:id', verifyCentreAccess, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    const sessionId = parseInt(req.params.id);
    const { dateTime, type, format, location, capacity, price, notes } = req.body;

    // Check if session belongs to this centre
    const existingSession = await prisma.mockSession.findFirst({
      where: { id: sessionId, centreId }
    });

    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: 'Mock session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    const updateData = {};
    if (dateTime) updateData.dateTime = new Date(dateTime);
    if (type) updateData.type = type;
    if (format) updateData.format = format;
    if (location !== undefined) updateData.location = location;
    if (capacity !== undefined) updateData.capacity = capacity ? parseInt(capacity) : null;
    if (price !== undefined) updateData.price = price ? parseFloat(price) : null;
    if (notes !== undefined) updateData.notes = notes;

    const session = await prisma.mockSession.update({
      where: { id: sessionId },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Mock session updated successfully',
      data: session
    });
  } catch (error) {
    console.error('Update mock session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * DELETE /api/education/mock-sessions/:id
 * Delete a mock session
 */
router.delete('/mock-sessions/:id', verifyCentreAccess, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    const sessionId = parseInt(req.params.id);

    // Check if session belongs to this centre
    const existingSession = await prisma.mockSession.findFirst({
      where: { id: sessionId, centreId }
    });

    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: 'Mock session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    await prisma.mockSession.delete({
      where: { id: sessionId }
    });

    res.json({
      success: true,
      message: 'Mock session deleted successfully'
    });
  } catch (error) {
    console.error('Delete mock session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// ─── STUDY GROUPS ─────────────────────────────────────────────────────────────
/**
 * GET /api/education/study-groups
 * Get all study groups for the authenticated centre
 */
router.get('/study-groups', verifyCentreAccess, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    const { page = 1, limit = 10 } = req.query;

    const groups = await prisma.studyGroup.findMany({
      where: { centreId },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: {
        _count: {
          select: {
            applications: true
          }
        }
      }
    });

    const total = await prisma.studyGroup.count({ where: { centreId } });

    res.json({
      success: true,
      data: {
        groups,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get study groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * POST /api/education/study-groups
 * Create a new study group
 */
router.post('/study-groups', verifyCentreAccess, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    const { name, level, schedule, capacity } = req.body;

    // Validation
    if (!name || !level || !schedule) {
      return res.status(400).json({
        success: false,
        error: 'Name, level, and schedule are required',
        code: 'MISSING_FIELDS'
      });
    }

    const group = await prisma.studyGroup.create({
      data: {
        centreId,
        name: name.trim(),
        level,
        schedule: schedule.trim(),
        capacity: capacity ? parseInt(capacity) : null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Study group created successfully',
      data: group
    });
  } catch (error) {
    console.error('Create study group error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * PUT /api/education/study-groups/:id
 * Update a study group
 */
router.put('/study-groups/:id', verifyCentreAccess, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    const groupId = parseInt(req.params.id);
    const { name, level, schedule, capacity } = req.body;

    // Check if group belongs to this centre
    const existingGroup = await prisma.studyGroup.findFirst({
      where: { id: groupId, centreId }
    });

    if (!existingGroup) {
      return res.status(404).json({
        success: false,
        error: 'Study group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (level) updateData.level = level;
    if (schedule) updateData.schedule = schedule.trim();
    if (capacity !== undefined) updateData.capacity = capacity ? parseInt(capacity) : null;

    const group = await prisma.studyGroup.update({
      where: { id: groupId },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Study group updated successfully',
      data: group
    });
  } catch (error) {
    console.error('Update study group error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * DELETE /api/education/study-groups/:id
 * Delete a study group
 */
router.delete('/study-groups/:id', verifyCentreAccess, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    const groupId = parseInt(req.params.id);

    // Check if group belongs to this centre
    const existingGroup = await prisma.studyGroup.findFirst({
      where: { id: groupId, centreId }
    });

    if (!existingGroup) {
      return res.status(404).json({
        success: false,
        error: 'Study group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    await prisma.studyGroup.delete({
      where: { id: groupId }
    });

    res.json({
      success: true,
      message: 'Study group deleted successfully'
    });
  } catch (error) {
    console.error('Delete study group error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * GET /api/education/study-groups/:id/applications
 * Get applications for a specific study group
 */
router.get('/study-groups/:id/applications', verifyCentreAccess, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    const groupId = parseInt(req.params.id);

    // Check if group belongs to this centre
    const existingGroup = await prisma.studyGroup.findFirst({
      where: { id: groupId, centreId }
    });

    if (!existingGroup) {
      return res.status(404).json({
        success: false,
        error: 'Study group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    const applications = await prisma.groupApplication.findMany({
      where: { studyGroupId: groupId },
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            currentBand: true,
            targetBand: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * POST /api/education/study-groups/:id/applications/:applicationId/respond
 * Accept or decline a group application
 */
router.post('/study-groups/:id/applications/:applicationId/respond', verifyCentreAccess, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    const groupId = parseInt(req.params.id);
    const applicationId = parseInt(req.params.applicationId);
    const { action } = req.body; // 'accept' or 'decline'

    if (!action || !['accept', 'decline'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be "accept" or "decline"',
        code: 'INVALID_ACTION'
      });
    }

    // Check if group belongs to this centre
    const existingGroup = await prisma.studyGroup.findFirst({
      where: { id: groupId, centreId }
    });

    if (!existingGroup) {
      return res.status(404).json({
        success: false,
        error: 'Study group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    const application = await prisma.groupApplication.findFirst({
      where: { id: applicationId, studyGroupId: groupId }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        code: 'APPLICATION_NOT_FOUND'
      });
    }

    const status = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
    
    const updatedApplication = await prisma.groupApplication.update({
      where: { id: applicationId },
      data: { status }
    });

    res.json({
      success: true,
      message: `Application ${action}ed successfully`,
      data: updatedApplication
    });
  } catch (error) {
    console.error('Respond to application error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
