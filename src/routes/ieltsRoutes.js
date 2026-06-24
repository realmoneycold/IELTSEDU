const express = require('express');
const { getIELTSLeaderboard } = require('../controllers/studentController');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();

router.get('/leaderboard', verifyToken, checkRole('STUDENT', 'ADMIN', 'CEO'), getIELTSLeaderboard);

module.exports = router;
