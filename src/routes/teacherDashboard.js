// ═══════════════════════════════════════════════════════════════
// Teacher Dashboard API - IELTSPRACTICE
// Complete CRUD operations for teachers
// ═══════════════════════════════════════════════════════════════

'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../models/prisma');
const { verifyTeacherAuth } = require('./teacherAuth');
const teacherCtrl = require('../controllers/teacherController');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'materials');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── MULTER CONFIGURATION ─────────────────────────────────────
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'material-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'image/jpeg',
      'image/png'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, JPG, PNG allowed.'), false);
    }
  }
});

// ─── PUBLIC LESSONS ─────────────────────────────────────────
/**
 * GET /api/teacher/lessons/public/upcoming
 * Public endpoint for upcoming lessons (no auth required)
 */
router.get('/lessons/public/upcoming', async (req, res) => {
  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        startTime: { gte: new Date() },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      },
      include: {
        teacher: { select: { full_name: true, name: true } }
      },
      orderBy: { startTime: 'asc' },
      take: 20
    });
    res.json({ success: true, data: lessons });
  } catch (error) {
    console.error('Public upcoming lessons error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch lessons', code: 'LESSONS_FETCH_ERROR' });
  }
});

// ─── DASHBOARD STATS ──────────────────────────────────────────
/**
 * GET /api/teacher/dashboard-stats
 * Fetch comprehensive dashboard statistics
 */
router.get('/dashboard-stats', verifyTeacherAuth, teacherCtrl.getDashboardStats);

// ─── PROFILE ROUTES ───────────────────────────────────────────
/**
 * GET /api/teacher/profile
 * Get current teacher profile
 */
router.get('/profile', verifyTeacherAuth, teacherCtrl.getTeacherProfile);

/**
 * PUT /api/teacher/profile
 * Update teacher profile
 */
router.put('/profile', verifyTeacherAuth, teacherCtrl.updateTeacherProfile);

/**
 * PATCH /api/teacher/profile/password
 * Update teacher password
 */
router.patch('/profile/password', verifyTeacherAuth, teacherCtrl.updateTeacherPassword);

// ─── LESSONS CRUD ─────────────────────────────────────────────
/**
 * GET /api/teacher/lessons
 * List all lessons for current teacher with pagination
 * Query: ?status=SCHEDULED&page=1&limit=10&upcoming=true
 */
router.get('/lessons', verifyTeacherAuth, teacherCtrl.getLessons);

/**
 * GET /api/teacher/lessons/:id
 * Get single lesson with materials
 */
router.get('/lessons/:id', verifyTeacherAuth, teacherCtrl.getLessonById);

/**
 * POST /api/teacher/lessons
 * Create new lesson
 * Body: { title, zoomLink, startTime, status? }
 */
router.post('/lessons', verifyTeacherAuth, teacherCtrl.createLesson);

/**
 * PUT /api/teacher/lessons/:id
 * Update lesson
 * Body: { title?, zoomLink?, startTime?, status? }
 */
router.put('/lessons/:id', verifyTeacherAuth, teacherCtrl.updateLesson);

/**
 * DELETE /api/teacher/lessons/:id
 * Delete lesson
 */
router.delete('/lessons/:id', verifyTeacherAuth, teacherCtrl.deleteLesson);

// ─── MATERIALS CRUD ───────────────────────────────────────────
/**
 * GET /api/teacher/materials
 * List all materials for current teacher
 * Query: ?lessonId=123&page=1&limit=10
 */
router.get('/materials', verifyTeacherAuth, teacherCtrl.getMaterials);

/**
 * GET /api/teacher/materials/:id
 * Get single material
 */
router.get('/materials/:id', verifyTeacherAuth, teacherCtrl.getMaterialById);

/**
 * POST /api/teacher/materials
 * Upload a material file (multipart/form-data)
 * FormData: file (required), lessonId (optional)
 */
router.post('/materials', verifyTeacherAuth, upload.single('file'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { lessonId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    // If lessonId provided, verify it belongs to this teacher
    if (lessonId) {
      const lesson = await prisma.lesson.findFirst({
        where: { id: parseInt(lessonId), teacherId }
      });

      if (!lesson) {
        // Delete uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(404).json({
          success: false,
          error: 'Lesson not found',
          code: 'LESSON_NOT_FOUND'
        });
      }
    }

    const material = await prisma.material.create({
      data: {
        teacherId,
        fileName: req.file.originalname,
        fileUrl: `/uploads/materials/${req.file.filename}`,
        fileType: req.file.mimetype,
        lessonId: lessonId ? parseInt(lessonId) : null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Material uploaded successfully',
      data: material
    });

  } catch (error) {
    console.error('Upload material error:', error);
    // Delete uploaded file on error
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({
      success: false,
      error: 'Failed to upload material',
      code: 'UPLOAD_ERROR'
    });
  }
});

/**
 * PUT /api/teacher/materials/:id
 * Update material metadata
 * Body: { fileName?, fileType?, lessonId? }
 */
router.put('/materials/:id', verifyTeacherAuth, teacherCtrl.updateMaterial);

/**
 * DELETE /api/teacher/materials/:id
 * Delete material (also removes file from disk)
 */
router.delete('/materials/:id', verifyTeacherAuth, async (req, res) => {
  try {
    const materialId = parseInt(req.params.id);
    const teacherId = req.user.id;

    const material = await prisma.material.findFirst({
      where: { id: materialId, teacherId }
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        error: 'Material not found',
        code: 'MATERIAL_NOT_FOUND'
      });
    }

    // Delete file from disk
    const filePath = path.join(__dirname, '..', '..', material.fileUrl.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.material.delete({
      where: { id: materialId }
    });

    res.json({
      success: true,
      message: 'Material deleted successfully'
    });

  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete material',
      code: 'MATERIAL_DELETE_ERROR'
    });
  }
});

// ─── FOLLOWERS CRUD ───────────────────────────────────────────
/**
 * GET /api/teacher/followers
 * List all students following this teacher
 * Query: ?page=1&limit=10
 */
router.get('/followers', verifyTeacherAuth, teacherCtrl.getFollowers);

/**
 * GET /api/teacher/followers/count
 * Get total follower count
 */
router.get('/followers/count', verifyTeacherAuth, teacherCtrl.getFollowerCount);

/**
 * DELETE /api/teacher/followers/:studentId
 * Remove a follower
 */
router.delete('/followers/:studentId', verifyTeacherAuth, teacherCtrl.removeFollower);

// ─── TEACHER STUDENTS ─────────────────────────────────────────
/**
 * GET /api/teacher/students
 * Returns paginated list of all students following this teacher,
 * including their band scores and activity counts.
 * Requires TEACHER role.
 * Query: ?page=1&limit=20&search=
 */
router.get('/students', verifyTeacherAuth, teacherCtrl.getTeacherStudents);

// ─── ASSIGNMENTS ──────────────────────────────────────────────
/**
 * POST /api/teacher/assignment
 * Create a new assignment (lesson with due date / description).
 * Requires TEACHER role.
 * Body: { title, startTime, zoomLink?, description? }
 */
router.post('/assignment', verifyTeacherAuth, teacherCtrl.createAssignment);

// ─── QUICK STATS ──────────────────────────────────────────────
/**
 * GET /api/teacher/stats/summary
 * Quick summary stats for UI cards
 */
router.get('/stats/summary', verifyTeacherAuth, async (req, res) => {
  try {
    const teacherId = req.user.id;

    const [
      totalLessons,
      upcomingLessons,
      completedLessons,
      totalMaterials,
      followerCount
    ] = await Promise.all([
      prisma.lesson.count({ where: { teacherId } }),
      prisma.lesson.count({
        where: {
          teacherId,
          status: 'SCHEDULED',
          startTime: { gte: new Date() }
        }
      }),
      prisma.lesson.count({
        where: {
          teacherId,
          status: 'COMPLETED'
        }
      }),
      prisma.material.count({ where: { teacherId } }),
      prisma.follow.count({ where: { teacherId } })
    ]);

    res.json({
      success: true,
      data: {
        totalLessons,
        upcomingLessons,
        completedLessons,
        totalMaterials,
        followerCount
      }
    });

  } catch (error) {
    console.error('Get stats summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      code: 'STATS_ERROR'
    });
  }
});

// ─── SUBMISSIONS / GRADING ────────────────────────────────────
router.get('/submissions', verifyTeacherAuth, teacherCtrl.getSubmissions);
router.post('/submissions/:id/grade', verifyTeacherAuth, teacherCtrl.gradeSubmission);

// ─── MESSAGING ────────────────────────────────────────────────
router.post('/message', verifyTeacherAuth, teacherCtrl.sendMessage);

// ─── NOTIFICATIONS ────────────────────────────────────────────
router.get('/notifications', verifyTeacherAuth, teacherCtrl.getNotifications);
router.post('/notifications/:id/read', verifyTeacherAuth, teacherCtrl.markNotificationRead);

// ─── SETTINGS ───────────────────────────────────────────────
router.get('/settings', verifyTeacherAuth, teacherCtrl.getSettings);
router.put('/settings', verifyTeacherAuth, teacherCtrl.updateSettings);

module.exports = router;
