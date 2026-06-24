const bcrypt = require('bcryptjs');   // bcryptjs — pure-JS, no native build needed
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../models/prisma');
const { getTrialInfo } = require('../middleware/trialMiddleware');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, isDemoMode, getDemoReason } = require('../services/emailService');

const VERIFICATION_CODE_TTL_HOURS = 24;   // 24 hours per spec
const PASSWORD_RESET_TTL_HOURS    = 1;    // 1 hour per spec
const JWT_EXPIRES_IN              = '24h'; // 24 hours per spec

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateResetToken() {
  return crypto.randomBytes(48).toString('hex');
}

// ─── SIGNUP ───────────────────────────────────────────────────
async function signup(req, res) {
  try {
    // Accept both firstName+lastName (new frontend) and full_name (legacy)
    let { firstName, lastName, full_name, username, email, password, country, role } = req.body || {};

    if (firstName && lastName) {
      full_name = `${firstName.trim()} ${lastName.trim()}`;
    }

    if (!full_name || !email || !password) {
      const missing = [];
      if (!full_name) missing.push('Full Name');
      if (!email) missing.push('Email');
      if (!password) missing.push('Password');
      return res.status(400).json({
        success: false,
        message: `Please provide all required fields: ${missing.join(', ')}`,
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    // Build and validate username format first
    const usernameRegex = /^[a-z0-9]{3,20}$/;
    let safeUsername = (username || '').toLowerCase().trim();

    if (safeUsername) {
      if (!usernameRegex.test(safeUsername)) {
        return res.status(400).json({
          success: false,
          message: 'Username can only contain lowercase letters and numbers (a-z, 0-9) and must be 3-20 characters'
        });
      }
    } else {
      // Fallback for legacy or if not provided
      safeUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
      if (safeUsername.length < 3) safeUsername = `user${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This email address is already registered. Please sign in or use a different email.'
      });
    }

    // Check username uniqueness
    const existingUsername = await prisma.user.findUnique({ where: { username: safeUsername } });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken. Please choose a different one.'
      });
    }

    const hashed = await bcrypt.hash(password, 12);

    const requestedRole = (role || 'STUDENT').toUpperCase();

    // Block admin/CEO self-registration
    if (['ADMIN', 'CEO', 'GRADER', 'SUPPORT', 'CONTENT', 'ANALYST', 'MANAGER'].includes(requestedRole)) {
      return res.status(403).json({ success: false, message: 'You cannot register an administrative account via this form.' });
    }

    const userRole = requestedRole === 'TEACHER' ? 'TEACHER' : 'STUDENT';

    // Calculate trial end date (30 days from now)
    const trialStartDate = new Date();
    const trialEndDate = new Date(trialStartDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        full_name: full_name.trim(),
        username: safeUsername || `user_${Date.now()}`,
        email: email.toLowerCase().trim(),
        password: hashed,
        country: country || null,
        role: userRole,
        current_band: 5.0,
        tasks_done: 0,
        plan: 'FREE_TRIAL',
        trialStartDate,
        trialEndDate,
      },
    });

    // Generate and store 6-digit OTP (24-hour expiry per spec)
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_HOURS * 60 * 60 * 1000);

    await prisma.verificationCode.create({
      data: { email: user.email, code, expiresAt },
    });

    // Send verification email (non-blocking — don't fail signup if email fails)
    let emailSent = true;
    try {
      const result = await sendVerificationEmail(user.email, code, full_name);
      if (result.demo) emailSent = false;
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
      emailSent = false;
      // Continue — user can request resend later
    }

    if (!emailSent || isDemoMode()) {
      console.warn('[Signup] Email service not configured (' + getDemoReason() + '). Verification code was NOT sent.');
    }

    return res.status(201).json({
      success: true,
      message: emailSent && !isDemoMode()
        ? 'Verification code sent to email'
        : 'Account created, but email service is not configured. Please contact support to verify your account.',
      email: user.email,
      email_configured: !isDemoMode(),
    });
  } catch (err) {
    console.error('Signup error', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Email or username is already taken' });
    }
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── VERIFY EMAIL ─────────────────────────────────────────────
async function verifyEmail(req, res) {
  try {
    const { email, code } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'email and code are required' });
    }

    const record = await prisma.verificationCode.findFirst({
      where: { email: email.toLowerCase().trim(), code: String(code).trim() },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Mark verified and clean up codes atomically
    await prisma.$transaction([
      prisma.user.update({
        where: { email: email.toLowerCase().trim() },
        data: { is_verified: true },
      }),
      prisma.verificationCode.deleteMany({ where: { email: email.toLowerCase().trim() } }),
    ]);

    // Send welcome email (non-blocking)
    try {
      await sendWelcomeEmail(user.email, user.full_name);
    } catch (emailErr) {
      console.error('Failed to send welcome email:', emailErr.message);
    }

    return res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    console.error('Verify email error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── RESEND VERIFICATION CODE ─────────────────────────────────
async function resendVerification(req, res) {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, message: 'email is required' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      // Don't reveal if user exists — security best practice
      return res.json({ success: true, message: 'If that email is registered, a new code has been sent.' });
    }
    if (user.is_verified) {
      return res.status(400).json({ success: false, message: 'This email is already verified.' });
    }

    // Delete old codes and create a new one with 24h expiry
    await prisma.verificationCode.deleteMany({ where: { email: user.email } });
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_HOURS * 60 * 60 * 1000);
    await prisma.verificationCode.create({ data: { email: user.email, code, expiresAt } });

    let emailSent = true;
    try {
      const result = await sendVerificationEmail(user.email, code, user.full_name);
      if (result.demo) emailSent = false;
    } catch (emailErr) {
      console.error('Failed to resend verification email:', emailErr.message);
      emailSent = false;
    }

    if (!emailSent || isDemoMode()) {
      console.warn('[Resend] Email service not configured (' + getDemoReason() + '). Verification code was NOT sent.');
    }

    return res.json({
      success: true,
      message: emailSent && !isDemoMode()
        ? 'A new verification code has been sent to your email.'
        : 'Email service is not configured. Please contact support.',
      email_configured: !isDemoMode(),
    });
  } catch (err) {
    console.error('Resend verification error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── LOGIN ────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const { email, password, role } = req.body || {};
    console.log('Login attempt for:', email);

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    console.log('User found:', !!user);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.is_verified) {
      console.log('User not verified');
      return res.status(403).json({
        success: false,
        message: 'Email not verified. Please check your inbox for the verification code.',
        requiresVerification: true,
        email: user.email,
      });
    }

    // Role check only when a specific portal sends role (optional)
    if (role && role.toUpperCase() !== user.role) {
      console.log('Role mismatch:', role, 'vs', user.role);
      return res.status(403).json({ success: false, message: 'Invalid role for this portal' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    console.log('Generating JWT with secret length:', process.env.JWT_SECRET?.length);
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }  // 24 hours per spec
    );
    console.log('JWT generated successfully');

    // Update last seen
    prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch((e) => console.error('LastSeen update error:', e));

    // Get trial/plan info
    const trialInfo = getTrialInfo(user);

    return res.json({
      success: true,
      token,
      role: user.role,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        country: user.country,
        role: user.role,
        current_band: user.current_band,
        is_onboarded: user.is_onboarded,
        plan: trialInfo.effectivePlan,
        trialDaysLeft: trialInfo.trialDaysLeft,
        isTrialExpired: trialInfo.isTrialExpired,
        isTrialActive: trialInfo.isTrialActive,
        trialEndDate: trialInfo.trialEndDate,
        dailyAiLimit: trialInfo.dailyAiLimit,
        aiUsageRemaining: trialInfo.aiUsageRemaining,
      },
    });
  } catch (err) {
    console.error('Login error details:', err);
    return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
}

// ─── FORGOT PASSWORD ──────────────────────────────────────────
async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};

    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // Always return same message to prevent email enumeration (security)
    const successMsg = 'Password reset email sent';

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      // Return 200 for security (don't reveal whether email exists)
      return res.json({ success: true, message: successMsg });
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // Generate cryptographically secure reset token
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token: resetToken, expiresAt },
    });

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.full_name);
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr.message);
      // Clean up the token if we couldn't send the email
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      return res.status(500).json({ success: false, message: 'Failed to send reset email. Please try again later.' });
    }

    const isDev = !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('re_test');
    return res.json({
      success: true,
      message: successMsg,
      ...(isDev && { dev_reset_token: resetToken }),
    });
  } catch (err) {
    console.error('Forgot password error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── RESET PASSWORD ───────────────────────────────────────────
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'token and newPassword are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link. Please request a new one.' });
    }

    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } });
      return res.status(400).json({ success: false, message: 'Reset link has expired. Please request a new one.' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    // Update password and invalidate all tokens in one transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
    ]);

    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── CHECK USERNAME AVAILABILITY ─────────────────────────────────────────────
async function checkUsername(req, res) {
  try {
    const username = (req.query.username || '').toLowerCase().trim();
    const usernameRegex = /^[a-z0-9]{3,20}$/;

    if (!username) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Username is required'
      });
    }

    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Username can only contain lowercase letters and numbers (a-z, 0-9) and must be 3-20 characters'
      });
    }

    const existing = await prisma.user.findUnique({ where: { username } });

    if (existing) {
      return res.json({ success: true, available: false, message: 'Username already taken' });
    }

    return res.json({ success: true, available: true, message: 'Username is available' });
  } catch (err) {
    console.error('Check username error', err);
    return res.status(500).json({ success: false, available: false, message: 'Server error' });
  }
}

module.exports = {
  signup,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
  checkUsername,
};
