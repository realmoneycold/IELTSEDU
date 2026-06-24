const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token and ensure user has CEO role
 * This middleware protects CEO-specific routes
 */
function requireCeoAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user has CEO role
    if (decoded.role !== 'CEO') {
      return res.status(403).json({ success: false, error: 'CEO access required' });
    }

    // Attach user info to request for use in route handlers
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    } else {
      return res.status(500).json({ success: false, error: 'Authentication error' });
    }
  }
}

module.exports = requireCeoAuth;
