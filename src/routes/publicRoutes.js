const express = require('express');
const centreCtrl = require('../controllers/centreController');

const router = express.Router();

/**
 * GET /api/public/centres/locations
 * Get all education centres with geolocation for map display
 */
router.get('/locations', centreCtrl.getCentresWithLocations);

/**
 * GET /api/public/centres
 * Get list of active education centres
 */
router.get('/', centreCtrl.getEducationCentres);

/**
 * GET /api/public/centres/mock-sessions
 * Get upcoming mock sessions from all education centres (public, no auth required)
 */
router.get('/mock-sessions', centreCtrl.getPublicMockSessions);

/**
 * GET /api/public/centres/groups
 * Get all study groups from all education centres (public, no auth required)
 */
router.get('/groups', centreCtrl.getPublicGroups);

/**
 * POST /api/public/centres/groups/:id/apply
 * Public application to a study group (no auth required)
 */
router.post('/groups/:id/apply', centreCtrl.createGroupApplication);

/**
 * POST /api/public/centres/mock-sessions/:id/book
 * Public booking for a mock test session (no auth required)
 */
router.post('/mock-sessions/:id/book', centreCtrl.createMockSessionBooking);

module.exports = router;
