const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const prisma = require('../models/prisma');
const jwt = require('jsonwebtoken');

const JWT_EXPIRES_IN = '24h';

// Generate random password for OAuth users
function generateRandomPassword() {
  return require('crypto').randomBytes(24).toString('hex');
}

// Generate username from email or name
function generateUsername(email, fullName) {
  const base = email ? email.split('@')[0] : fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const clean = base.slice(0, 15).toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean + Math.floor(1000 + Math.random() * 9000);
}

// ─── GOOGLE OAUTH STRATEGY ──────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.API_URL || 'https://ieltsedu.net'}/api/v1/auth/oauth/google/callback`,
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const fullName = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();
        const googleId = profile.id;

        // Check if user exists with this email
        let user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

        if (user) {
          // User exists - update with Google OAuth info
          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: 'google',
                providerAccountId: googleId,
              },
            },
            update: {
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            },
            create: {
              userId: user.id,
              type: 'oauth',
              provider: 'google',
              providerAccountId: googleId,
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              token_type: 'Bearer',
              scope: 'email profile',
            },
          });
          return done(null, user);
        }

        // Create new user
        user = await prisma.user.create({
          data: {
            full_name: fullName,
            email: email.toLowerCase(),
            username: generateUsername(email, fullName),
            password: await require('bcryptjs').hash(generateRandomPassword(), 12),
            role: 'STUDENT',
            current_band: 5.0,
            tasks_done: 0,
            is_verified: true,
            country: null,
          },
        });

        // Create account record
        await prisma.account.create({
          data: {
            userId: user.id,
            type: 'oauth',
            provider: 'google',
            providerAccountId: googleId,
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'Bearer',
            scope: 'email profile',
          },
        });

        // Send welcome email
        try {
          const { sendWelcomeEmail } = require('../services/emailService');
          await sendWelcomeEmail(user);
        } catch (e) {
          console.log('Welcome email failed:', e.message);
        }

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth Error:', error);
        return done(error, null);
      }
    }
  )
);
}

// ─── TELEGRAM OAUTH STRATEGY ──────────────────────────────────────
// NOTE: Telegram login uses the widget POST endpoint (telegramWidgetLogin)
// instead of passport strategy, because passport-telegram-official is ESM-only.
// The GET /telegram and /telegram/callback routes are kept for compatibility.

// Serialize/deserialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// ─── GOOGLE OAUTH HANDLERS ────────────────────────────────────────
function googleAuth(req, res, next) {
  // Guard: Google strategy is only registered when env vars are present
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const missing = [];
    if (!process.env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
    if (!process.env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET');
    console.error('[OAuth] Missing env vars:', missing.join(', '));
    return res.status(503).json({
      success: false,
      message: 'Google login is not configured. Add these environment variables in Render: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. See SETUP.md for instructions.'
    });
  }
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })(req, res, next);
}

function googleCallback(req, res, next) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('[OAuth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing in callback');
    return res.redirect('/login.html?error=oauth_not_configured');
  }
  passport.authenticate('google', { failureRedirect: '/login.html?error=oauth_failed' }, async (err, user, info) => {
    if (err) {
      console.error('Google Auth Error:', err);
      return res.redirect('/login.html?error=oauth_failed');
    }
    if (!user) {
      return res.redirect('/login.html?error=oauth_failed');
    }
    
    try {
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Also set cookie for API requests that read cookies
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      // Build minimal user payload for frontend localStorage
      const userPayload = Buffer.from(JSON.stringify({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        username: user.username,
        role: user.role,
        image: user.image || null,
      })).toString('base64');

      // Redirect through oauth-callback bridge so frontend can store token in localStorage
      // (auth-guard.js checks localStorage, not cookies)
      res.redirect(`/oauth-callback?token=${encodeURIComponent(token)}&role=${encodeURIComponent(user.role)}&user=${encodeURIComponent(userPayload)}`);
    } catch (error) {
      console.error('Google Callback Error:', error);
      res.redirect('/login.html?error=auth_failed');
    }
  })(req, res, next);
}

// ─── TELEGRAM OAUTH HANDLERS ─────────────────────────────────────
function telegramAuth(req, res) {
  res.redirect('/login.html?error=telegram_use_widget');
}

function telegramCallback(req, res) {
  res.redirect('/login.html?error=telegram_use_widget');
}

// ─── TELEGRAM WIDGET LOGIN ────────────────────────────────────────
async function telegramWidgetLogin(req, res) {
  try {
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = req.body;
    
    if (!id || !hash) {
      return res.status(400).json({ success: false, message: 'Missing Telegram data' });
    }

    // Verify the hash (Telegram validation)
    const crypto = require('crypto');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(process.env.TELEGRAM_BOT_TOKEN).digest();
    const dataCheckString = Object.keys(req.body)
      .filter(key => key !== 'hash')
      .sort()
      .map(key => `${key}=${req.body[key]}`)
      .join('\n');
    const calculatedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
    
    if (calculatedHash !== hash) {
      return res.status(401).json({ success: false, message: 'Invalid Telegram authentication' });
    }

    // Check if auth is expired (24 hours)
    if (Date.now() / 1000 - auth_date > 86400) {
      return res.status(401).json({ success: false, message: 'Authentication expired' });
    }

    const telegramId = id.toString();
    const fullName = `${first_name || ''} ${last_name || ''}`.trim() || username || `User${telegramId}`;
    const safeUsername = (username || `tg${telegramId.slice(-6)}`).toLowerCase().replace(/[^a-z0-9]/g, '');

    // Find or create user
    let account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'telegram',
          providerAccountId: telegramId,
        },
      },
      include: { user: true },
    });

    let user;
    if (account) {
      user = account.user;
      // Update photo if changed
      if (photo_url && user.image !== photo_url) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { image: photo_url },
        });
      }
    } else {
      // Check for unique username
      let finalUsername = safeUsername;
      const existingUser = await prisma.user.findUnique({ where: { username: finalUsername } });
      if (existingUser) {
        finalUsername = `${finalUsername}${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // Create new user
      user = await prisma.user.create({
        data: {
          full_name: fullName,
          email: `${telegramId}@telegram.user`,
          username: finalUsername,
          password: await require('bcryptjs').hash(generateRandomPassword(), 12),
          role: 'STUDENT',
          current_band: 5.0,
          tasks_done: 0,
          is_verified: true,
          country: null,
          image: photo_url || null,
        },
      });

      await prisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: 'telegram',
          providerAccountId: telegramId,
          token_type: 'Bot',
        },
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        username: user.username,
        role: user.role,
        image: user.image,
      },
    });
  } catch (error) {
    console.error('Telegram Widget Login Error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
}

module.exports = {
  passport,
  googleAuth,
  googleCallback,
  telegramAuth,
  telegramCallback,
  telegramWidgetLogin,
};
