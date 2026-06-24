// ═══════════════════════════════════════════════════════════════
// Middleware: requireAdmin
// Validates that the authenticated user has ADMIN or CEO role
// Must be used AFTER verifyToken middleware from auth.js
// ═══════════════════════════════════════════════════════════════

'use strict';

/**
 * Middleware to restrict route access to ADMIN and CEO roles only.
 *
 * Usage:
 *   const { verifyToken } = require('../middleware/auth');
 *   const { requireAdmin } = require('../middleware/admin');
 *   router.get('/protected', verifyToken, requireAdmin, handler);
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const role = String(req.user.role || '').toUpperCase();

  if (!['ADMIN', 'CEO'].includes(role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }

  next();
}

module.exports = { requireAdmin };
