// ═══════════════════════════════════════════════════════════════
// Middleware: requireTeacher
// Validates that the authenticated user has TEACHER role
// Must be used AFTER verifyToken middleware from auth.js
// ═══════════════════════════════════════════════════════════════

'use strict';

/**
 * Middleware to restrict route access to TEACHER role only.
 *
 * Usage:
 *   const { verifyToken } = require('../middleware/auth');
 *   const { requireTeacher } = require('../middleware/teacher');
 *   router.get('/protected', verifyToken, requireTeacher, handler);
 */
function requireTeacher(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const role = String(req.user.role || '').toUpperCase();

  if (role !== 'TEACHER') {
    return res.status(403).json({
      success: false,
      message: 'Teacher access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }

  next();
}

module.exports = { requireTeacher };
