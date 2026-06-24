// ═══════════════════════════════════════════════════════════════
// routes/ceo.js  — Express API routes for IELTSPRACTICE CEO Suite
//
// Mount in app.js:
//   const ceoRoutes = require('./routes/ceo');
//   app.use('/api/ceo', requireCeoAuth, ceoRoutes);
//
// Middleware assumed:
//   requireCeoAuth  — verifies JWT and checks role === 'CEO'
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../src/models/prisma');
const UAParser = require('ua-parser-js');   // npm i ua-parser-js
// const geoip = require('geoip-lite');      // npm i geoip-lite (optional)

// ─────────────────────────────────────────────────────────────
// HELPER: today's date range (UTC)
// ─────────────────────────────────────────────────────────────
function todayRange() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

// ─────────────────────────────────────────────────────────────
// ██  ADMINS  ██
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/ceo/admins
 * List all admin accounts with their connected devices
 */
router.get('/admins', async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      include: { devices: { where: { isActive: true } } },
      orderBy: { createdAt: 'desc' },
    });
    // Strip passwordHash from response
    const safe = admins.map(({ passwordHash, ...a }) => a);
    res.json({ success: true, data: safe });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ceo/admins
 * Create a new admin account
 * Body: { name, email, phone, password, role }
 */
router.post('/admins', async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'name, email and password are required' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.admin.create({
      data: { name, email, phone, passwordHash, role: role?.toUpperCase() || 'GRADER' },
    });
    // Create a notification
    await prisma.notification.create({
      data: { icon: '🛡️', message: `New Admin registered: ${name}` },
    });
    const { passwordHash: _, ...safe } = admin;
    res.status(201).json({ success: true, data: safe });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Email already in use' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/ceo/admins/:id
 * Get a single admin — includes plain password recovery (CEO only)
 * NOTE: For production use asymmetric encryption, not plaintext storage.
 */
router.get('/admins/:id', async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { devices: true, tasks: { where: { assignedDate: { gte: todayRange().start } } } },
    });
    if (!admin) return res.status(404).json({ success: false, error: 'Admin not found' });
    const { passwordHash: _, ...safe } = admin;
    res.json({ success: true, data: safe });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/ceo/admins/:id
 * Update admin info (name, email, phone, role, optionally password)
 */
router.put('/admins/:id', async (req, res) => {
  const { name, email, phone, role, password } = req.body;
  const id = parseInt(req.params.id);
  try {
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (role) updateData.role = role.toUpperCase();
    if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.admin.update({ where: { id }, data: updateData });
    const { passwordHash: _, ...safe } = admin;
    res.json({ success: true, data: safe });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/ceo/admins/:id
 * Permanently delete an admin (cascades devices & tasks)
 */
router.delete('/admins/:id', async (req, res) => {
  try {
    await prisma.admin.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Admin deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ██  DEVICES  ██
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/ceo/admins/:id/devices
 * All devices registered to a specific admin
 */
router.get('/admins/:id/devices', async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      where: { adminId: parseInt(req.params.id) },
      orderBy: { lastActiveAt: 'desc' },
    });
    res.json({ success: true, data: devices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ceo/devices/register
 * Called automatically on login to register/update the current device.
 * Body: { adminId } — plus server reads req headers for UA & IP
 */
router.post('/devices/register', async (req, res) => {
  const { adminId } = req.body;
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = req.ip || req.connection.remoteAddress;
  const parser = new UAParser(userAgent);
  const ua = parser.getResult();

  const deviceName = `${ua.os.name || ''} ${ua.device.type === 'mobile' ? ua.device.vendor || '' : ''}`.trim() || 'Unknown Device';
  const browser = `${ua.browser.name || 'Browser'} ${ua.browser.major || ''}`.trim();
  const os = ua.os.name ? `${ua.os.name} ${ua.os.version || ''}`.trim() : null;
  const deviceType = ua.device.type === 'mobile' ? 'MOBILE'
    : ua.device.type === 'tablet' ? 'TABLET'
    : ua.os.name?.toLowerCase().includes('mac') || ua.os.name?.toLowerCase().includes('windows') || ua.os.name?.toLowerCase().includes('linux')
      ? 'LAPTOP' : 'DESKTOP';

  // Optional: geo-lookup
  // const geo = geoip.lookup(ipAddress);
  // const location = geo ? `${geo.city}, ${geo.country}` : 'Unknown';
  const location = 'Tashkent, UZ'; // replace with geo-lookup result

  try {
    // Upsert: if same IP+adminId already registered, just update lastActiveAt
    const device = await prisma.device.upsert({
      where: {
        // You'll need a @@unique([adminId, ipAddress]) in schema for this to work
        // Otherwise use create + findFirst logic
        id: 0 // fallback — see note below
      },
      update: { lastActiveAt: new Date(), isActive: true, browser, userAgent },
      create: { adminId: parseInt(adminId), deviceName, browser, os, deviceType, ipAddress, location, userAgent },
    });
    res.json({ success: true, data: device });
  } catch {
    // Fallback: just create
    const device = await prisma.device.create({
      data: { adminId: parseInt(adminId), deviceName, browser, os, deviceType, ipAddress, location, userAgent },
    });
    res.json({ success: true, data: device });
  }
});

/**
 * DELETE /api/ceo/devices/:id
 * Revoke / remove a device session
 */
router.delete('/devices/:id', async (req, res) => {
  try {
    await prisma.device.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Device removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ██  TASKS  ██
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/ceo/tasks
 * All tasks, optionally filtered by adminId or date
 * Query: ?adminId=1&date=2026-03-04
 */
router.get('/tasks', async (req, res) => {
  const { adminId, date } = req.query;
  const where = {};
  if (adminId) where.adminId = parseInt(adminId);
  if (date) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setUTCHours(23, 59, 59, 999);
    where.assignedDate = { gte: d, lte: end };
  }
  try {
    const tasks = await prisma.adminTask.findMany({
      where,
      include: { admin: { select: { id: true, name: true, role: true } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/ceo/tasks/progress
 * Returns each admin's task completion % for today
 */
router.get('/tasks/progress', async (req, res) => {
  const { start, end } = todayRange();
  try {
    const admins = await prisma.admin.findMany({ select: { id: true, name: true } });
    const progress = await Promise.all(admins.map(async (a) => {
      const total = await prisma.adminTask.count({ where: { adminId: a.id, assignedDate: { gte: start, lte: end } } });
      const done = await prisma.adminTask.count({ where: { adminId: a.id, assignedDate: { gte: start, lte: end }, isDone: true } });
      return { adminId: a.id, name: a.name, total, done, pct: total > 0 ? Math.round(done / total * 100) : 0 };
    }));
    res.json({ success: true, data: progress });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ceo/tasks
 * Assign a new task to an admin
 * Body: { adminId, title, notes, label, priority }
 */
router.post('/tasks', async (req, res) => {
  const { adminId, title, notes, label, priority } = req.body;
  if (!adminId || !title) {
    return res.status(400).json({ success: false, error: 'adminId and title are required' });
  }
  try {
    const task = await prisma.adminTask.create({
      data: {
        adminId: parseInt(adminId),
        title,
        notes,
        label: label?.toUpperCase().replace(/ /g, '_') || 'CUSTOMER_SERVICE',
        priority: priority?.toUpperCase() || 'MEDIUM',
      },
    });
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/ceo/tasks/:id/toggle
 * Toggle a task's isDone status
 */
router.patch('/tasks/:id/toggle', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const current = await prisma.adminTask.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ success: false, error: 'Task not found' });
    const task = await prisma.adminTask.update({
      where: { id },
      data: { isDone: !current.isDone, doneAt: !current.isDone ? new Date() : null },
    });
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/ceo/tasks/:id
 * Remove a task
 */
router.delete('/tasks/:id', async (req, res) => {
  try {
    await prisma.adminTask.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ██  EDUCATIONAL CENTRES  ██
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/ceo/centres
 * All partner centres, sorted by student count desc
 * Query: ?q=tashkent  (search by name or city)
 */
router.get('/centres', async (req, res) => {
  const { q } = req.query;
  const where = { isActive: true };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
    ];
  }
  try {
    const centres = await prisma.educationalCentre.findMany({
      where,
      orderBy: { totalStudents: 'desc' },
    });
    res.json({ success: true, data: centres });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ceo/centres
 * Create a new partner centre
 */
router.post('/centres', async (req, res) => {
  const { name, city, district, address, contactEmail, contactPhone, websiteUrl } = req.body;
  if (!name || !city) {
    return res.status(400).json({ success: false, error: 'name and city are required' });
  }
  try {
    const centre = await prisma.educationalCentre.create({
      data: { name, city, district, address, contactEmail, contactPhone, websiteUrl },
    });
    res.status(201).json({ success: true, data: centre });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/ceo/centres/:id
 * Update a centre's info or manually set student counts/rating
 */
router.put('/centres/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, city, district, address, contactEmail, contactPhone, totalStudents, activeStudents, rating, isActive } = req.body;
  try {
    const centre = await prisma.educationalCentre.update({
      where: { id },
      data: { name, city, district, address, contactEmail, contactPhone, totalStudents, activeStudents, rating, isActive },
    });
    res.json({ success: true, data: centre });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/ceo/centres/:id
 * Soft-delete (set isActive = false) or hard delete
 */
router.delete('/centres/:id', async (req, res) => {
  const { hard } = req.query; // ?hard=1 for permanent deletion
  const id = parseInt(req.params.id);
  try {
    if (hard === '1') {
      await prisma.educationalCentre.delete({ where: { id } });
      res.json({ success: true, message: 'Centre permanently deleted' });
    } else {
      await prisma.educationalCentre.update({ where: { id }, data: { isActive: false } });
      res.json({ success: true, message: 'Centre deactivated' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ██  GROWTH ANALYTICS  ██
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/ceo/analytics/overview
 * High-level growth numbers for the dashboard stat cards
 */
router.get('/analytics/overview', async (req, res) => {
  try {
    const [totalUsers, onlineUsers, totalCentres] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastSeenAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } } }), // active in last 5 min
      prisma.educationalCentre.count({ where: { isActive: true } }),
    ]);
    res.json({ success: true, data: { totalUsers, onlineUsers, totalCentres } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/ceo/analytics/signups
 * Signup trends for the Growth chart
 * Query: ?period=daily|weekly|monthly
 */
router.get('/analytics/signups', async (req, res) => {
  const { period = 'monthly' } = req.query;
  try {
    // Raw query to group by time period (PostgreSQL)
    let trunc;
    if (period === 'daily') trunc = 'day';
    else if (period === 'weekly') trunc = 'week';
    else trunc = 'month';

    const rows = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC(${trunc}, "createdAt") AS period,
        COUNT(*) AS count
      FROM "User"
      GROUP BY 1
      ORDER BY 1 ASC
      LIMIT 24
    `;
    res.json({ success: true, data: rows.map(r => ({ period: r.period, count: Number(r.count) })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/ceo/analytics/regions
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
    res.json({ success: true, data: rows.map(r => ({ city: r.city, count: Number(r.count) })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ██  STRATEGIC GOALS (KANBAN)  ██
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/ceo/goals
 * All kanban goals, grouped by column
 */
router.get('/goals', async (req, res) => {
  try {
    const goals = await prisma.strategicGoal.findMany({ orderBy: { createdAt: 'desc' } });
    const grouped = {
      TODO: goals.filter(g => g.column === 'TODO'),
      IN_PROGRESS: goals.filter(g => g.column === 'IN_PROGRESS'),
      DONE: goals.filter(g => g.column === 'DONE'),
    };
    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ceo/goals
 * Create a new strategic goal
 */
router.post('/goals', async (req, res) => {
  const { title, priority, column, dueDate } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'title is required' });
  try {
    const goal = await prisma.strategicGoal.create({
      data: { title, priority: priority?.toUpperCase() || 'MEDIUM', column: column || 'TODO', dueDate: dueDate ? new Date(dueDate) : null },
    });
    res.status(201).json({ success: true, data: goal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/ceo/goals/:id
 * Move a goal to a different column
 */
router.patch('/goals/:id', async (req, res) => {
  const { column, title, priority } = req.body;
  try {
    const goal = await prisma.strategicGoal.update({
      where: { id: parseInt(req.params.id) },
      data: { column, title, priority: priority?.toUpperCase() },
    });
    res.json({ success: true, data: goal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/ceo/goals/:id
 */
router.delete('/goals/:id', async (req, res) => {
  try {
    await prisma.strategicGoal.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ██  NOTIFICATIONS  ██
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/ceo/notifications
 * Latest 20 system notifications
 */
router.get('/notifications', async (req, res) => {
  try {
    const notifs = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
    res.json({ success: true, data: notifs, unreadCount: notifs.filter(n => !n.isRead).length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/ceo/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/notifications/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
    res.json({ success: true, message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Test endpoint - no auth required
 */
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'CEO routes are working!' });
});

/**
 * Test goals endpoint - no auth required for debugging
 */
router.get('/goals-test', async (req, res) => {
  try {
    const goals = await prisma.strategicGoal.findMany({ orderBy: { createdAt: 'desc' } });
    const grouped = {
      TODO: goals.filter(g => g.column === 'TODO'),
      IN_PROGRESS: goals.filter(g => g.column === 'IN_PROGRESS'),
      DONE: goals.filter(g => g.column === 'DONE'),
    };
    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/ceo/profile
 * Update CEO profile information
 */
router.put('/profile', async (req, res) => {
  const { firstName, lastName, password, avatarUrl } = req.body;
  try {
    const updateData = {};
    if (firstName) updateData.name = firstName + ' ' + lastName;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 12);
    if (avatarUrl) updateData.avatarUrl = avatarUrl;

    // In a real implementation, you'd have a CEO table or update a specific admin record
    // For now, we'll just return success with the updated data
    res.json({ 
      success: true, 
      data: { name: updateData.name, avatarUrl: updateData.avatarUrl } 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
