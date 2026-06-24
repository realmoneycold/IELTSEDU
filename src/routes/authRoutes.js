const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  signup,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
  checkUsername,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/unified-auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,  // Max 10 accounts per hour per IP
  message: {
    success: false,
    message: 'Too many signup attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

router.post('/signup', signupLimiter, validate('signup'), signup);
router.post('/verify', verifyEmail);         // POST /api/auth/verify
router.post('/verify-email', verifyEmail);   // POST /api/auth/verify-email (alias per task spec)
router.post('/resend-verification', resendVerification);
router.post('/login', validate('login'), login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', validate('resetPassword'), resetPassword);
router.get('/check-username', checkUsername);

// Unified token verification
router.get('/verify-token', requireAuth(), (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

// ─── HEALTH / DIAGNOSTIC ──────────────────────────────────────
router.get('/health', (req, res) => {
  const { isDemoMode, getDemoReason } = require('../services/emailService');
  const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  res.json({
    success: true,
    services: {
      email: {
        configured: !isDemoMode(),
        reason: isDemoMode() ? getDemoReason() : 'OK',
      },
      google_oauth: {
        configured: googleConfigured,
        missing: googleConfigured ? [] : [
          !process.env.GOOGLE_CLIENT_ID ? 'GOOGLE_CLIENT_ID' : null,
          !process.env.GOOGLE_CLIENT_SECRET ? 'GOOGLE_CLIENT_SECRET' : null,
        ].filter(Boolean),
      },
    },
  });
});

// ─── ADMIN: VIEW PENDING VERIFICATION CODES ─────────────────────
// Only works with a valid admin JWT + ADMIN role. For debugging email issues.
router.get('/admin/verification-codes', requireAuth(['ADMIN']), async (req, res) => {
  const prisma = require('../models/prisma');
  try {
    const codes = await prisma.verificationCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        email: true,
        code: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    res.json({ success: true, count: codes.length, codes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

