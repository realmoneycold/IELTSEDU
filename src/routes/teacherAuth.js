// ═══════════════════════════════════════════════════════════════
// Teacher Authentication API - IELTSPRACTICE
// Secure authentication for teacher accounts
// ═══════════════════════════════════════════════════════════════

'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const prisma = require('../models/prisma');

// ─── RATE LIMITING ─────────────────────────────────────────────────────────────────────
const teacherLoginLimiter = rateLimit({
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

// ─── TEACHER LOGIN ─────────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/teacher/login
 * Authenticate teacher accounts
 */
router.post('/login', teacherLoginLimiter, async (req, res) => {
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

  try {
    // Step 1: Check if user exists and has TEACHER role
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        role: 'TEACHER',
        is_verified: true
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        password: true,
        role: true,
        country: true,
        createdAt: true
      }
    });

    if (!user) {
      console.log(`Teacher login failed: User not found - Email: ${email}, IP: ${clientIP}`);
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please check your email and password.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Step 2: Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log(`Teacher login failed: Invalid password - User: ${user.id}, IP: ${clientIP}`);
      
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
        role: 'TEACHER',
        fullName: user.full_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Step 4: Return success response
    console.log(`Teacher login successful: User: ${user.id}, IP: ${clientIP}`);

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
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// ─── VERIFY TEACHER TOKEN ─────────────────────────────────────────────────────────────
/**
 * GET /api/auth/teacher/verify
 * Verify JWT token for teachers
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
    
    if (decoded.role !== 'TEACHER') {
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
        role: 'TEACHER',
        is_verified: true
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        country: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'Teacher account not found or inactive',
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

// ─── TEACHER MIDDLEWARE ─────────────────────────────────────────────────────────────
/**
 * Middleware to protect teacher routes
 * Verifies JWT token and sets req.user
 */
function verifyTeacherAuth(req, res, next) {
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
    
    if (decoded.role !== 'TEACHER') {
      return res.status(403).json({
        success: false,
        error: 'Teacher access required',
        code: 'TEACHER_REQUIRED'
      });
    }

    // Get fresh user data
    prisma.user.findFirst({
      where: {
        id: decoded.id,
        email: decoded.email,
        role: 'TEACHER',
        is_verified: true
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true
      }
    }).then(user => {
      if (!user) {
        return res.status(403).json({
          success: false,
          error: 'Teacher account not found or inactive',
          code: 'ACCOUNT_INACTIVE'
        });
      }

      req.user = user;
      req.token = token;
      next();
    }).catch(err => {
      console.error('Teacher auth DB error:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
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
      console.error('Teacher auth middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }
}

module.exports = router;
module.exports.verifyTeacherAuth = verifyTeacherAuth;
