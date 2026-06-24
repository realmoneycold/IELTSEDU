// ═══════════════════════════════════════════════════════════
//  IELTSPRACTICE — Teacher Portal API Routes
//  File: routes/teacher.js
//  Mount: app.use('/api/teacher', teacherRouter)
// ═══════════════════════════════════════════════════════════
'use strict';

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const jwt      = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// ─── Ensure uploads dir exists ───────────────────────────
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'materials');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── Multer config ────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-').toLowerCase();
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['application/pdf',
                   'application/msword',
                   'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and Word documents are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// ═══════════════════════════════════════════════════════════
//  AUTH MIDDLEWARE — requireTeacher
// ═══════════════════════════════════════════════════════════
async function requireTeacher(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Accept TEACHER or CEO roles
    if (!['TEACHER', 'CEO'].includes(payload.role)) {
      return res.status(403).json({ error: 'Teacher access required.' });
    }

    // Fetch the TeacherProfile linked to this user
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: payload.userId },
    });

    if (!teacherProfile) {
      return res.status(403).json({ error: 'No teacher profile found for this account.' });
    }

    req.user          = payload;
    req.teacherProfile = teacherProfile;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

// ═══════════════════════════════════════════════════════════
//  TEACHER AUTH — POST /api/teacher/login
// ═══════════════════════════════════════════════════════════
const bcrypt = require('bcrypt');

router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where:   { email: email.toLowerCase().trim() },
      include: { teacherProfile: true },
    });

    if (!user || !['TEACHER', 'CEO'].includes(user.role)) {
      return res.status(401).json({ message: 'Invalid credentials or no teacher access.' });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (!user.teacherProfile) {
      return res.status(403).json({ message: 'No teacher profile found. Contact admin.' });
    }

    const expiresIn = rememberMe ? '30d' : '24h';
    const token = jwt.sign(
      { userId: user.id, role: user.role, teacherId: user.teacherProfile.id },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    return res.json({
      success:     true,
      token,
      redirectUrl: '/teacher/dashboard',
      teacher: {
        id:            user.id,
        firstName:     user.firstName,
        lastName:      user.lastName,
        email:         user.email,
        specialisation:user.teacherProfile.specialisation,
        avatarUrl:     user.teacherProfile.avatarUrl,
      },
    });
  } catch (err) {
    console.error('[POST /api/teacher/login]', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// ═══════════════════════════════════════════════════════════
//  FOLLOWER STUDENTS
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/teacher/followers
 * Returns all students who follow the authenticated teacher.
 * Query params: ?search=<string>&page=<number>&limit=<number>
 */
router.get('/followers', requireTeacher, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;
    const skip   = (parseInt(page) - 1) * parseInt(limit);
    const take   = parseInt(limit);

    const where = {
      teacherId: req.teacherProfile.id,
      student: search ? {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName:  { contains: search, mode: 'insensitive' } },
          { email:     { contains: search, mode: 'insensitive' } },
        ],
      } : undefined,
    };

    const [followers, total] = await Promise.all([
      prisma.teacherFollower.findMany({
        where,
        skip,
        take,
        orderBy:  { followedAt: 'desc' },
        include:  {
          student: {
            select: {
              id:          true,
              firstName:   true,
              lastName:    true,
              email:       true,
              avatarUrl:   true,
              targetBand:  true,
              lastActiveAt:true,
              createdAt:   true,
            },
          },
        },
      }),
      prisma.teacherFollower.count({ where }),
    ]);

    const students = followers.map(f => ({
      followId:     f.id,
      followedAt:   f.followedAt,
      id:           f.student.id,
      name:         `${f.student.firstName} ${f.student.lastName}`,
      email:        f.student.email,
      avatarUrl:    f.student.avatarUrl || null,
      targetBand:   f.student.targetBand || null,
      lastActivity: f.student.lastActiveAt || null,
    }));

    return res.json({ success: true, students, total, page: parseInt(page), limit: take });
  } catch (err) {
    console.error('[GET /api/teacher/followers]', err);
    return res.status(500).json({ error: 'Failed to fetch followers.' });
  }
});

/**
 * DELETE /api/teacher/followers/:studentId
 * Remove a student from the teacher's follower list.
 */
// but hoow
router.delete('/followers/:studentId', requireTeacher, async (req, res) => {
  try {
    await prisma.teacherFollower.deleteMany({
      where: { teacherId: req.teacherProfile.id, studentId: req.params.studentId },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/teacher/followers]', err);
    return res.status(500).json({ error: 'Failed to remove follower.' });
  }
});

// ═══════════════════════════════════════════════════════════
//  MATERIALS LIBRARY
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/teacher/materials
 * Returns all materials uploaded by the authenticated teacher.
 * Query params: ?search=<string>&lessonId=<id>&type=PDF|DOC|LINK
 */
router.get('/materials', requireTeacher, async (req, res) => {
  try {
    const { search, lessonId, type } = req.query;

    const where = {
      teacherId: req.teacherProfile.id,
      ...(type     && { fileType: type.toUpperCase() }),
      ...(lessonId && { lessonId }),
      ...(search   && {
        name: { contains: search, mode: 'insensitive' },
      }),
    };

    const materials = await prisma.material.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { lesson: { select: { id: true, title: true } } },
    });

    return res.json({ success: true, materials });
  } catch (err) {
    console.error('[GET /api/teacher/materials]', err);
    return res.status(500).json({ error: 'Failed to fetch materials.' });
  }
});

/**
 * POST /api/teacher/materials
 * Upload a file (PDF/DOC) or save a mock-test link.
 *
 * For file uploads: multipart/form-data with fields:
 *   - file   (binary)
 *   - name   (string)
 *   - lesson (string — lesson title or lessonId)
 *
 * For links: application/json with fields:
 *   - name     (string)
 *   - fileUrl  (string)
 *   - fileType "LINK"
 *   - lesson   (string)
 */
router.post('/materials', requireTeacher, (req, res, next) => {
  // Detect if this is a link submission (no file)
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    return next(); // skip multer
  }
  upload.single('file')(req, res, next);
}, async (req, res) => {
  try {
    const { name, lesson, fileType, fileUrl: bodyFileUrl } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Material name is required.' });
    }

    let fileUrl, matFileType, fileSize, mimeType;

    if (req.file) {
      // Physical file uploaded via Multer
      fileUrl     = `/uploads/materials/${req.file.filename}`;
      fileSize    = req.file.size;
      mimeType    = req.file.mimetype;
      matFileType = req.file.mimetype === 'application/pdf' ? 'PDF' : 'DOC';
    } else if (fileType === 'LINK' && bodyFileUrl) {
      // Mock test link
      fileUrl     = bodyFileUrl;
      matFileType = 'LINK';
      fileSize    = null;
      mimeType    = null;
    } else {
      return res.status(400).json({ error: 'A file or a valid URL is required.' });
    }

    // Optionally resolve lessonId from title
    let resolvedLessonId = null;
    if (lesson) {
      const lessonRecord = await prisma.lesson.findFirst({
        where: { teacherId: req.teacherProfile.id, title: { contains: lesson, mode:'insensitive' } },
      });
      resolvedLessonId = lessonRecord?.id || null;
    }

    const material = await prisma.material.create({
      data: {
        name:      name.trim(),
        fileUrl,
        fileType:  matFileType,
        fileSize,
        mimeType,
        teacherId: req.teacherProfile.id,
        lessonId:  resolvedLessonId,
      },
    });

    return res.status(201).json({ success: true, material });
  } catch (err) {
    console.error('[POST /api/teacher/materials]', err);
    // Clean up uploaded file if DB save failed
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    return res.status(500).json({ error: 'Failed to save material.' });
  }
});

/**
 * DELETE /api/teacher/materials/:id
 * Delete a material (and its file from disk if applicable).
 */
router.delete('/materials/:id', requireTeacher, async (req, res) => {
  try {
    const material = await prisma.material.findFirst({
      where: { id: req.params.id, teacherId: req.teacherProfile.id },
    });
    if (!material) return res.status(404).json({ error: 'Material not found.' });

    // Remove physical file (ignore errors — may be a link or already deleted)
    if (material.fileType !== 'LINK' && material.fileUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', material.fileUrl);
      fs.unlink(filePath, () => {});
    }

    await prisma.material.delete({ where: { id: req.params.id } });

    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/teacher/materials]', err);
    return res.status(500).json({ error: 'Failed to delete material.' });
  }
});

/**
 * PATCH /api/teacher/materials/:id/download
 * Increment download counter (call when student downloads a file).
 */
router.patch('/materials/:id/download', requireTeacher, async (req, res) => {
  try {
    await prisma.material.update({
      where: { id: req.params.id },
      data:  { downloadCount: { increment: 1 } },
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update download count.' });
  }
});

// ═══════════════════════════════════════════════════════════
//  SCHEDULE / LESSONS
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/teacher/schedule
 * Returns upcoming lessons for the authenticated teacher.
 * Query params: ?from=<ISO date>&to=<ISO date>
 */
router.get('/schedule', requireTeacher, async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date();
    const to   = req.query.to   ? new Date(req.query.to)   : new Date(Date.now() + 30*24*3600*1000);

    const lessons = await prisma.lesson.findMany({
      where: {
        teacherId:   req.teacherProfile.id,
        scheduledAt: { gte: from, lte: to },
      },
      orderBy: { scheduledAt: 'asc' },
      include: { materials: { select: { id:true, name:true, fileType:true } } },
    });

    return res.json({ success: true, lessons });
  } catch (err) {
    console.error('[GET /api/teacher/schedule]', err);
    return res.status(500).json({ error: 'Failed to fetch schedule.' });
  }
});

// ═══════════════════════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/teacher/profile
 */
router.get('/profile', requireTeacher, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:   { id: req.user.userId },
      select:  { id:true, firstName:true, lastName:true, email:true },
    });
    return res.json({
      success: true,
      profile: {
        ...user,
        specialisation: req.teacherProfile.specialisation,
        avatarUrl:      req.teacherProfile.avatarUrl,
        bio:            req.teacherProfile.bio,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

/**
 * PATCH /api/teacher/profile
 */
router.patch('/profile', requireTeacher, async (req, res) => {
  try {
    const { firstName, lastName, password, specialisation, bio } = req.body;
    const updates = {};
    if (firstName) updates.firstName = firstName.trim();
    if (lastName)  updates.lastName  = lastName.trim();
    if (password)  updates.passwordHash = await bcrypt.hash(password, 12);

    if (Object.keys(updates).length > 0) {
      await prisma.user.update({ where: { id: req.user.userId }, data: updates });
    }

    const profileUpdates = {};
    if (specialisation !== undefined) profileUpdates.specialisation = specialisation;
    if (bio !== undefined)            profileUpdates.bio            = bio;
    if (Object.keys(profileUpdates).length > 0) {
      await prisma.teacherProfile.update({
        where: { id: req.teacherProfile.id },
        data:  profileUpdates,
      });
    }

    return res.json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    console.error('[PATCH /api/teacher/profile]', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ═══════════════════════════════════════════════════════════
//  MESSAGING (stub — wire to your comms system)
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/teacher/message
 * Send a message to a student.
 */
router.post('/message', requireTeacher, async (req, res) => {
  try {
    const { studentId, subject, body } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'Message body is required.' });
    // TODO: integrate with your messaging/email system
    // e.g. await sendEmail({ to: student.email, subject, body });
    return res.json({ success: true, message: 'Message sent.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send message.' });
  }
});
// but how did you it
//just take risk xd

// ═══════════════════════════════════════════════════════════
//  MULTER ERROR HANDLER
// ═══════════════════════════════════════════════════════════
router.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 20 MB.' });
  }
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: 'An unexpected error occurred.' });
});

module.exports = router;
