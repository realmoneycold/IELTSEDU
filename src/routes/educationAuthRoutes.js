// ═══════════════════════════════════════════════════════════════
// Education Centre Authentication API - IELTSPRACTICE
// Secure authentication for education centre staff and administrators
// ═══════════════════════════════════════════════════════════════

'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const prisma = require('../models/prisma');

// ─── RATE LIMITING ─────────────────────────────────────────────────────────────────────
const educationLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: {
    success: false,
    error: 'Too many login attempts. Please try again in 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// ─── GET CENTRES ─────────────────────────────────────────────────────────────────────
/**
 * GET /api/education/centres
 * Fetch all available education centres
 */
router.get('/centres', async (req, res) => {
  try {
    const centres = await prisma.educationCentre.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        code: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: centres
    });
  } catch (error) {
    console.error('Fetch centres error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch education centres',
      code: 'FETCH_ERROR'
    });
  }
});

// ─── EDUCATION CENTRE LOGIN ─────────────────────────────────────────────────────────────
/**
 * POST /api/auth/education/login
 * Authenticate education centre users
 */
router.post('/login', educationLoginLimiter, async (req, res) => {
  const { centreId, email, password } = req.body;
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
    // Step 1: Check if user exists
    const whereClause = {
      email: email.toLowerCase().trim(),
      isActive: true
    };
    if (centreId) {
      whereClause.centreId = parseInt(centreId);
    }

    const user = await prisma.centreUser.findFirst({
      where: whereClause,
      include: {
        centre: {
          select: {
            id: true,
            name: true,
            city: true,
            code: true
          }
        }
      }
    });

    if (!user) {
      // Log failed attempt
      console.log(`Education login failed: User not found - Email: ${email}, Centre: ${centreId}, IP: ${clientIP}`);
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please check your email, password, and centre.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Step 2: Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      // Log failed attempt
      console.log(`Education login failed: Invalid password - User: ${user.id}, Centre: ${centreId}, IP: ${clientIP}`);
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please check your email, password, and centre.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Step 3: Generate JWT with education centre role
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        centreId: user.centreId,
        role: 'EDUCATION_CENTRE',
        centreName: user.centre.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Step 4: Update last login
    await prisma.centreUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Step 5: Return success response
    console.log(`Education login successful: User: ${user.id}, Centre: ${user.centreId}, IP: ${clientIP}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          centreId: user.centreId
        },
        centre: user.centre
      }
    });

  } catch (error) {
    console.error('Education login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// ─── VERIFY TOKEN ─────────────────────────────────────────────────────────────────────
/**
 * GET /api/auth/education/verify
 * Verify JWT token for education centre users
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
    
    if (decoded.role !== 'EDUCATION_CENTRE') {
      return res.status(403).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Get fresh user data
    const user = await prisma.centreUser.findFirst({
      where: { 
        id: decoded.id,
        email: decoded.email,
        centreId: decoded.centreId,
        isActive: true
      },
      include: {
        centre: {
          select: {
            id: true,
            name: true,
            city: true,
            code: true
          }
        }
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        centreId: true,
        lastLoginAt: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'User account not found or inactive',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    res.json({
      success: true,
      data: {
        user,
        centre: user.centre
      }
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

// ─── EDUCATION MIDDLEWARE ─────────────────────────────────────────────────────────────
/**
 * Middleware to protect education centre routes
 * Verifies JWT token and sets req.user
 */
function requireEducationAuth(req, res, next) {
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
    
    if (decoded.role !== 'EDUCATION_CENTRE') {
      return res.status(403).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
  }
}

module.exports = router;
module.exports.requireEducationAuth = requireEducationAuth;
