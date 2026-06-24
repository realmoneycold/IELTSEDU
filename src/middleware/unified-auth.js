// ═══════════════════════════════════════════════════════════════
// Unified Auth Middleware — IELTSPRACTICE
//
// Replaces 5 separate auth implementations with one factory.
//
// USAGE:
//   const { requireAuth } = require('../middleware/unified-auth');
//
//   router.get('/profile', requireAuth('STUDENT'), handler);
//   router.get('/admin',   requireAuth('ADMIN', 'CEO'), handler);
//   router.get('/any',     requireAuth(), handler);  // any authenticated user
// ═══════════════════════════════════════════════════════════════

'use strict';

const jwt = require('jsonwebtoken');

/**
 * Universal JWT auth middleware factory.
 *
 * @param  {...string} allowedRoles - If provided, restricts access to these roles.
 *                                    Omit to allow any authenticated user.
 * @returns {Function} Express middleware
 */
function requireAuth(...allowedRoles) {
  return (req, res, next) => {
    // 1. Extract token — prefer Authorization header, fall back to cookie
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ')
      ? auth.slice(7)
      : (req.cookies && req.cookies.authToken) || null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // 2. Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    // 3. Check role (if restrictions specified)
    if (allowedRoles.length > 0) {
      const userRole = String(decoded.role || '').toUpperCase();
      const normalized = allowedRoles.map((r) => String(r).toUpperCase());

      if (!normalized.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: `Insufficient permissions — requires ${allowedRoles.join(' or ')} role`,
          code: 'FORBIDDEN',
        });
      }
    }

    // 4. Attach user to request
    // Normalize user ID field (some tokens use `id`, others `userId`)
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role,
      fullName: decoded.fullName || decoded.full_name,
      ...decoded,
    };

    next();
  };
}

module.exports = { requireAuth };
