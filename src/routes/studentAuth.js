// ═════════════════════════════════════════════════════════════
// Student Authentication API - IELTSPRACTICE
// Secure authentication for student accounts
// ═════════════════════════════════════════════════════════════

'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const prisma = require('../models/prisma');
const { validate } = require('../middleware/validation');

// ─── RATE LIMITING ─────────────────────────────────────────────────────────────────────
const studentLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: 'Too many login attempts. Please try again in 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// ─── EMAIL VALIDATION ─────────────────────────────────────────────────────────────────────
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ─── STUDENT LOGIN ─────────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/student/login
 * Authenticate student accounts
 */
router.post('/login', studentLoginLimiter, validate('login'), async (req, res) => {
  const { email, password } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

  // Input validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required',
      code: 'MISSING_FIELDS'
    });
  }

  // Email format validation
  if (!validateEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid email address',
      code: 'INVALID_EMAIL_FORMAT'
    });
  }

  try {
    // Step 1: Check if user exists and has STUDENT role
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        role: 'STUDENT',
        is_verified: true
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        password: true,
        role: true,
        country: true,
        target_band: true,
        current_band: true,
        createdAt: true
      }
    });

    if (!user) {
      console.log(`Student login failed: User not found - Email: ${email}, IP: ${clientIP}`);
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please check your email and password.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Step 2: Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log(`Student login failed: Invalid password - User: ${user.id}, IP: ${clientIP}`);
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please check your email and password.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Step 3: Generate JWT with user information
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: 'STUDENT',
        fullName: user.full_name,
        targetBand: user.target_band,
        currentBand: user.current_band
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Step 4: Return success response
    console.log(`Student login successful: User: ${user.id}, IP: ${clientIP}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          country: user.country,
          target_band: user.target_band,
          current_band: user.current_band,
          createdAt: user.createdAt
        },
        redirectUrl: '/dashboard.html'
      }
    });

  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// ─── VERIFY STUDENT TOKEN ─────────────────────────────────────────────────────────────
/**
 * GET /api/auth/student/verify
 * Verify JWT token for students
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
    
    if (decoded.role !== 'STUDENT') {
      return res.status(403).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Get fresh user data
    const user = await prisma.user.findFirst({
      where: { 
        id: decoded.id,
        email: decoded.email,
        role: 'STUDENT',
        is_verified: true
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        country: true,
        target_band: true,
        current_band: true,
        tasks_done: true,
        weekly_goal_percent: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'Student account not found or inactive',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    res.json({
      success: true,
      data: { user }
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

// ─── STUDENT MIDDLEWARE ─────────────────────────────────────────────────────────────
/**
 * Middleware to protect student routes
 * Verifies JWT token and sets req.user
 */
function verifyStudentAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'STUDENT') {
      return res.status(403).json({
        success: false,
        error: 'Student access required',
        code: 'STUDENT_REQUIRED'
      });
    }

    // Get fresh user data
    prisma.user.findFirst({
      where: { 
        id: decoded.id,
        email: decoded.email,
        role: 'STUDENT',
        is_verified: true
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        target_band: true,
        current_band: true
      }
    }).then(user => {
      if (!user) {
        return res.status(403).json({
          success: false,
          error: 'Student account not found or inactive',
          code: 'ACCOUNT_INACTIVE'
        });
      }

      req.user = user;
      req.token = token;
      next();
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
      console.error('Student auth middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }
}

module.exports = router;
module.exports.verifyStudentAuth = verifyStudentAuth;
