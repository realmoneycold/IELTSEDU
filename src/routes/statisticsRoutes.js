/**
 * Statistics Routes
 * API endpoints for test tracking and performance analytics
 */

'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/unified-auth');
const statisticsController = require('../controllers/statisticsController');

// All statistics routes require authentication (STUDENT role)
router.use(requireAuth('STUDENT'));

// Save test attempt when user completes a test
router.post('/attempt', statisticsController.saveTestAttempt);

// Get comprehensive dashboard overview
router.get('/overview', statisticsController.getOverview);

// Get user's overall statistics
router.get('/stats', statisticsController.getUserStatistics);

// Get weakness analysis and recommendations
router.get('/weaknesses', statisticsController.getWeaknessAnalysis);

// Get progress over time (for charts)
router.get('/progress', statisticsController.getProgressOverTime);

// Get study streak and daily activity
router.get('/streak', statisticsController.getStudyStreak);

// Get detailed test feedback
router.get('/test/:id', statisticsController.getTestDetails);

module.exports = router;
