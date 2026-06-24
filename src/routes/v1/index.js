const express = require('express');
const authRoutes = require('../authRoutes');
const oauthRoutes = require('../oauthRoutes');
const adminAuthRoutes = require('../adminAuthRoutes');
const educationAuthRoutes = require('../educationAuth');
const educationRoutes = require('../educationRoutes');
const teacherAuthRoutes = require('../teacherAuth');
const teacherDashboardRoutes = require('../teacherDashboard');
const studentAuthRoutes = require('../studentAuth');
const partnerRoutes = require('../partnerRoutes');
const studentRoutes = require('../studentRoutes');
const adminRoutes = require('../adminRoutes');
const userRoutes = require('../userRoutes');
const typingRoutes = require('../typingRoutes');
const ieltsRoutes = require('../ieltsRoutes');
const examRoutes = require('../examRoutes');
const leaderboardRoutes = require('../leaderboardRoutes');
const statisticsRoutes = require('../statisticsRoutes');
const ceoRoutes = require('../../../ceo-page/routes-ceo');
const requireCeoAuth = require('../../middleware/ceoAuth');
const dashboardRoutes = require('../dashboardRoutes');
const roomsRoutes = require('../roomsRoutes');
const publicRoutes = require('../publicRoutes');
const aiRoutes = require('../aiRoutes');
const contactRoutes = require('../contactRoutes');
const trialRoutes = require('../trialRoutes');

const centrePortalRoutes = require('../centrePortalRoutes');
const adminPortalRoutes = require('../adminPortalRoutes');
const studentPortalRoutes = require('../studentPortalRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/auth/oauth', oauthRoutes);
router.use('/auth/admin', adminAuthRoutes);
router.use('/auth/education', educationAuthRoutes);
router.use('/auth/teacher', teacherAuthRoutes);
router.use('/auth/student', studentAuthRoutes);
router.use('/education', educationRoutes);
router.use('/public/centres', publicRoutes);
router.use('/teacher', teacherDashboardRoutes);
router.use('/public', educationAuthRoutes); // For public centres endpoint
router.use('/partners', partnerRoutes);
router.use('/student', studentRoutes);
router.use('/admin', adminRoutes);
router.use('/user', userRoutes);
router.use('/typing', typingRoutes);
router.use('/ielts', ieltsRoutes);
router.use('/exams', examRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/ceo', requireCeoAuth, ceoRoutes);
router.use('/ai', aiRoutes);
router.use('/contact', contactRoutes);

// Trial & Payment routes
router.use('/', trialRoutes);  // Handles /user/trial-status, /admin/upgrade-user, /payment/*


// Dashboard routes (must be before /student to avoid conflicts)
router.use('/student/dashboard', dashboardRoutes);

// Rooms API for Live Hub (GET/POST/PATCH/DELETE)
router.use('/rooms', roomsRoutes);

// New unified logic blocks based on the data engineering architecture
router.use('/centre', centrePortalRoutes);
router.use('/admin-portal', adminPortalRoutes);
router.use('/student-portal', studentPortalRoutes);

module.exports = router;
