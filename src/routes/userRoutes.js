const express = require('express');
const { getProfile, getUserProfile, getPerformanceHistory, getPracticeStats, getNextExamDate, getStudyStreak, saveOnboardingData } = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', verifyToken, getUserProfile);
router.get('/performance-history', verifyToken, getPerformanceHistory);
router.get('/practice-stats', verifyToken, getPracticeStats);
router.get('/next-exam', verifyToken, getNextExamDate);
router.get('/study-streak', verifyToken, getStudyStreak);
router.post('/onboarding', verifyToken, saveOnboardingData);

module.exports = router;
