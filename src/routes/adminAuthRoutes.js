// ═════════════════════════════════════════════════════════════════════════
// Admin Authentication API - IELTSPRACTICE
// Secure admin login with rate limiting, brute-force protection, and session management
// ═════════════════════════════════════════════════════════════════════════

'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const prisma = require('../models/prisma');

// ─── RATE LIMITING & BRUTE-FORCE PROTECTION ─────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 attempts per 15 minutes
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// ─── ADMIN LOGIN ENDPOINT ─────────────────────────────────────────────────────────
/**
 * POST /api/auth/admin/login
 * Secure admin authentication with comprehensive logging
 */
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password, rememberMe = false } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  const userAgent = req.headers['user-agent'];
  
  // Input validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required',
      code: 'MISSING_CREDENTIALS'
    });
  }

  // Extract device info from user agent
  const deviceInfo = extractDeviceInfo(userAgent);

  try {
    // Step 1: Verify admin exists
    const admin = await prisma.user.findFirst({
      where: { 
        email: email.toLowerCase().trim(),
        role: { in: ['ADMIN', 'CEO'] }
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        password: true,
        role: true,
        isActive: true,
        lastSeenAt: true
      }
    });

    if (!admin) {
      // Log failed attempt - account not found
      await logLoginAttempt(null, clientIP, deviceInfo, userAgent, false, 'ACCOUNT_NOT_FOUND');
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    if (!admin.isActive) {
      // Log failed attempt - account inactive
      await logLoginAttempt(admin.id, clientIP, deviceInfo, userAgent, false, 'ACCOUNT_INACTIVE');
      return res.status(403).json({
        success: false,
        error: 'Account is inactive. Please contact administrator.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Step 2: Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    
    if (!isPasswordValid) {
      // Log failed attempt - invalid password
      await logLoginAttempt(admin.id, clientIP, deviceInfo, userAgent, false, 'INVALID_PASSWORD');
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Step 3: Generate JWT token
    const tokenExpiry = rememberMe ? '30d' : '24h'; // 30 days if remember me, 24 hours default
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'admin' // Distinguish from user tokens
      },
      process.env.JWT_SECRET,
      { expiresIn: tokenExpiry }
    );

    // Step 4: Update admin last login and last seen
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        lastSeenAt: new Date()
      }
    });

    // Step 5: Log successful login
    await logLoginAttempt(admin.id, clientIP, deviceInfo, userAgent, true, 'SUCCESS');

    // Step 6: Return success response
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        admin: {
          id: admin.id,
          name: admin.full_name,
          email: admin.email,
          role: admin.role,
          lastSeenAt: admin.lastSeenAt
        },
        expiresIn: rememberMe ? '30 days' : '24 hours'
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────────

/**
 * Extract device information from user agent string
 */
function extractDeviceInfo(userAgent) {
  if (!userAgent) return 'Unknown Device';
  
  let deviceInfo = 'Unknown';
  
  // Detect browser
  if (userAgent.includes('Chrome')) deviceInfo = 'Chrome';
  else if (userAgent.includes('Firefox')) deviceInfo = 'Firefox';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) deviceInfo = 'Safari';
  else if (userAgent.includes('Edge')) deviceInfo = 'Edge';
  
  // Detect OS
  if (userAgent.includes('Windows')) deviceInfo += ' on Windows';
  else if (userAgent.includes('Mac')) deviceInfo += ' on macOS';
  else if (userAgent.includes('Linux')) deviceInfo += ' on Linux';
  else if (userAgent.includes('Android')) deviceInfo += ' on Android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) deviceInfo += ' on iOS';
  
  return deviceInfo;
}

/**
 * Log login attempt (temporary implementation without LoginLog model)
 */
async function logLoginAttempt(userId, ipAddress, deviceInfo, userAgent, success, reason) {
  try {
    console.log(`Login Attempt: ${success ? 'SUCCESS' : 'FAILED'} | User: ${userId || 'N/A'} | IP: ${ipAddress} | Device: ${deviceInfo} | Reason: ${reason}`);
    
    await prisma.loginLog.create({
      data: {
        userId,
        ipAddress,
        deviceInfo,
        userAgent,
        success,
        reason,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
}

// ─── AUTO-SEED DEFAULT ADMIN ─────────────────────────────────────────────────────
/**
 * POST /api/auth/admin/seed
 * Create default admin account if none exists (for first-time setup)
 */
router.post('/seed', async (req, res) => {
  try {
    // Check if any admin exists
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    
    if (adminCount > 0) {
      return res.json({
        success: true,
        message: 'Admin accounts already exist',
        data: { count: adminCount }
      });
    }

    // Create default admin account
    const defaultPassword = 'Admin123!@#'; // Strong default password
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const admin = await prisma.user.create({
      data: {
        full_name: 'Default Admin',
        email: 'admin@ieltspractice.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });

    console.log('=== DEFAULT ADMIN ACCOUNT CREATED ===');
    console.log(`Email: ${admin.email}`);
    console.log(`Password: ${defaultPassword}`);
    console.log('=====================================');

    res.json({
      success: true,
      message: 'Default admin account created successfully',
      data: {
        admin: {
          id: admin.id,
          name: admin.full_name,
          email: admin.email,
          role: admin.role
        },
        credentials: {
          email: admin.email,
          password: defaultPassword
        }
      }
    });

  } catch (error) {
    console.error('Admin seed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create default admin account',
      code: 'SEED_ERROR'
    });
  }
});

// ─── VERIFY TOKEN ───────────────────────────────────────────────────────────────
/**
 * GET /api/auth/admin/verify
 * Verify JWT token and return admin info
 */
router.get('/verify', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token required',
      code: 'TOKEN_REQUIRED'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Get fresh admin data
    const adminRecord = await prisma.user.findFirst({
      where: { id: decoded.id, role: { in: ['ADMIN', 'CEO'] } },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true
      }
    });
    
    // Map full_name to name for frontend compatibility
    const admin = adminRecord ? { ...adminRecord, name: adminRecord.full_name } : null;

    if (!admin || !admin.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Admin account not found or inactive',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    res.json({
      success: true,
      data: { admin }
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    } else {
      console.error('Token verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }
});

module.exports = router;

// ─── TEMPORARY DEVELOPMENT PASSWORD RESET ─────────────────────────────────────
/**
 * POST /api/auth/admin/reset-password
 * Temporary password reset for development - REMOVE IN PRODUCTION
 */
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  
  if (!email || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Email and new password are required',
      code: 'MISSING_FIELDS'
    });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const existingAdmin = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), role: { in: ['ADMIN', 'CEO'] } }
    });
    
    if (!existingAdmin) {
      throw new Error('Admin not found');
    }

    const admin = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { password: hashedPassword }
    });
    admin.name = admin.full_name; // for the success response

    
    console.log(`🔑 Password reset for admin: ${admin.email}`);
    
    res.json({
      success: true,
      message: 'Password reset successful',
      data: { 
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password - admin not found',
      code: 'RESET_FAILED'
    });
  }
});
