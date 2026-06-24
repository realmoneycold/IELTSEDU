const express = require('express');
const { requireAuth } = require('../middleware/unified-auth');
const ctrl = require('../controllers/studentPortalController');

const router = express.Router();

router.use(requireAuth('STUDENT'));

router.post('/practice/typing', ctrl.saveTypingPractice);
router.post('/practice/chat', ctrl.saveAiChat);

router.get('/performance/weekly', ctrl.getWeeklyPerformance);

module.exports = router;
