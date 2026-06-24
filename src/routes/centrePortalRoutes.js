// ═══════════════════════════════════════════════════════════════
// Centre Portal Routes - IELTSPRACTICE
// Complete CRUD operations for Education Centres
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const { requireAuth } = require('../middleware/unified-auth');
const centreCtrl = require('../controllers/centreController');
const prisma = require('../models/prisma');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth('CENTRE_ADMIN'));

// ═══════════════════════════════════════════════════════════════
// DASHBOARD & STATS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/centre/dashboard-stats
 * Get comprehensive dashboard statistics
 */
router.get('/dashboard-stats', centreCtrl.getDashboardStats);

// ═══════════════════════════════════════════════════════════════
// CENTRE PROFILE CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/centre/profile
 * Get current centre profile
 */
router.get('/profile', centreCtrl.getCentreProfile);

/**
 * PUT /api/centre/profile
 * Update centre profile
 */
router.put('/profile', centreCtrl.updateCentreProfile);

// ═══════════════════════════════════════════════════════════════
// MOCK SESSIONS CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/centre/mock-sessions
 * List all mock sessions for centre
 * Query: ?page=1&limit=10&type=Academic&upcoming=true
 */
router.get('/mock-sessions', centreCtrl.getMockSessions);

/**
 * GET /api/centre/mock-sessions/:id
 * Get single mock session with results
 */
router.get('/mock-sessions/:id', centreCtrl.getMockSessionById);

/**
 * POST /api/centre/mock-sessions
 * Create new mock session
 * Body: { dateTime, type, format, location?, capacity?, price?, notes? }
 */
router.post('/mock-sessions', centreCtrl.createMockSession);

/**
 * PUT /api/centre/mock-sessions/:id
 * Update mock session
 */
router.put('/mock-sessions/:id', centreCtrl.updateMockSession);

/**
 * DELETE /api/centre/mock-sessions/:id
 * Delete mock session
 */
router.delete('/mock-sessions/:id', centreCtrl.deleteMockSession);

// ═══════════════════════════════════════════════════════════════
// MOCK RESULTS CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/centre/mock-results
 * List all mock results for centre sessions
 * Query: ?page=1&limit=20&sessionId=123
 */
router.get('/mock-results', centreCtrl.getMockResults);

/**
 * PUT /api/centre/mock-results/:id
 * Update mock result scores
 * Body: { listening?, reading?, writing?, speaking?, overall? }
 */
router.put('/mock-results/:id', centreCtrl.updateMockResult);

/**
 * DELETE /api/centre/mock-results/:id
 * Delete mock result
 */
router.delete('/mock-results/:id', centreCtrl.deleteMockResult);

// ═══════════════════════════════════════════════════════════════
// STUDY GROUPS CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/centre/groups
 * List all study groups for centre
 * Query: ?page=1&limit=10&status=OPEN&level=INTERMEDIATE
 */
router.get('/groups', centreCtrl.getStudyGroups);

/**
 * GET /api/centre/groups/:id
 * Get single study group with applications
 */
router.get('/groups/:id', centreCtrl.getStudyGroupById);

/**
 * POST /api/centre/groups
 * Create new study group
 * Body: { name, level, schedule, startDate?, endDate?, capacity?, description?, teacherId? }
 */
router.post('/groups', centreCtrl.createStudyGroup);

/**
 * PUT /api/centre/groups/:id
 * Update study group
 */
router.put('/groups/:id', centreCtrl.updateStudyGroup);

/**
 * DELETE /api/centre/groups/:id
 * Delete study group
 */
router.delete('/groups/:id', centreCtrl.deleteStudyGroup);

// ═══════════════════════════════════════════════════════════════
// GROUP APPLICATIONS CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/centre/groups/:id/applications
 * Get all applications for a specific study group
 */
router.get('/groups/:id/applications', centreCtrl.getGroupApplications);

/**
 * GET /api/centre/applications
 * Get all pending applications across all groups for this centre
 */
router.get('/applications', centreCtrl.getAllApplications);

/**
 * POST /api/centre/applications/:id/respond
 * Accept or decline a group application
 * Body: { action: "accept" | "decline" }
 */
router.post('/applications/:id/respond', centreCtrl.respondToApplication);

// ═══════════════════════════════════════════════════════════════
// MOCK SESSION BOOKINGS CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/centre/mock-session-bookings
 * Get all mock session bookings across all sessions for this centre
 */
router.get('/mock-session-bookings', centreCtrl.getMockSessionBookings);

/**
 * POST /api/centre/mock-session-bookings/:id/respond
 * Accept or decline a mock session booking
 * Body: { action: "accept" | "decline" }
 */
router.post('/mock-session-bookings/:id/respond', centreCtrl.respondToMockSessionBooking);

// ═══════════════════════════════════════════════════════════════
// INQUIRIES CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/centre/inquiries
 * List all inquiries for centre
 * Query: ?page=1&limit=20&isRead=false
 */
router.get('/inquiries', centreCtrl.getInquiries);

/**
 * PATCH /api/centre/inquiries/:id/mark-read
 * Mark inquiry as read
 */
router.patch('/inquiries/:id/mark-read', centreCtrl.markInquiryRead);

/**
 * DELETE /api/centre/inquiries/:id
 * Delete inquiry
 */
router.delete('/inquiries/:id', centreCtrl.deleteInquiry);

module.exports = router;
