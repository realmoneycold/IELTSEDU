const express = require('express');
const router = express.Router();
const {
  googleAuth,
  googleCallback,
  telegramAuth,
  telegramCallback,
  telegramWidgetLogin,
} = require('../controllers/oauthController');

// ─── GOOGLE OAUTH ROUTES ─────────────────────────────────────────
// Initiate Google OAuth
router.get('/google', googleAuth);

// Google OAuth callback
router.get('/google/callback', googleCallback);

// ─── TELEGRAM OAUTH ROUTES ───────────────────────────────────────
// Telegram OAuth via widget (POST from frontend)
router.post('/telegram', telegramWidgetLogin);

// Telegram OAuth via passport (alternative method)
router.get('/telegram', telegramAuth);
router.get('/telegram/callback', telegramCallback);

module.exports = router;
