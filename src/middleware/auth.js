const jwt = require('jsonwebtoken');

// Extract token from Authorization header or cookie fallback
function extractToken(req) {
  // From Authorization: Bearer <token>
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // From cookie (browser sessions)
  if (req.cookies && req.cookies.authToken) {
    return req.cookies.authToken;
  }
  return null;
}

function verifyToken(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Normalize: some legacy tokens use `userId` instead of `id`
    if (decoded.userId != null && decoded.id == null) {
      decoded.id = decoded.userId;
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function checkRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const userRole = String(req.user.role).toUpperCase();
    const normalized = allowedRoles.map((r) => String(r).toUpperCase());
    if (!normalized.includes(userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = {
  extractToken,
  verifyToken,
  checkRole,
};
