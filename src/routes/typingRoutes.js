const express = require('express');
const { getLeaderboard, submitTypingResult, getPracticeTexts, getRandomTypingText, getUserTypingHistory, generatePlaceholders } = require('../controllers/typingController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/typing/submit - Submit a typing test result
router.post('/submit', verifyToken, submitTypingResult);

// GET /api/typing/leaderboard - Get typing leaderboard
// Public endpoint (no auth required so dashboard can load it)
router.get('/leaderboard', getLeaderboard);

// GET /api/typing/my-history - Get current user's typing history
router.get('/my-history', verifyToken, getUserTypingHistory);

// GET /api/typing/practice-text - Get a random practice text (Prompt #42 exact)
router.get('/practice-text', getRandomTypingText);

// GET /api/typing/practice-texts - Get list of practice texts
router.get('/practice-texts', getPracticeTexts);

// POST /api/typing/generate-placeholders - Generate placeholder entries
router.post('/generate-placeholders', generatePlaceholders);

module.exports = router;
