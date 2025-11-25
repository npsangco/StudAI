/**
 * Helper function for route-level authentication
 * Works in conjunction with sessionLockCheck middleware
 * 
 * This middleware checks if the user is authenticated via:
 * 1. Session cookie (req.session.userId)
 * 2. JWT token processed by parent middleware (req.user.userId)
 */

export function requireAuth(req, res, next) {
  // Method 1: Check session cookie (primary)
  if (req.session && req.session.userId) {
    return next();
  }
  
  // Method 2: Check if already authenticated by parent middleware (e.g., sessionLockCheck)
  // This handles JWT token authentication
  if (req.user && req.user.userId) {
    return next();
  }
  
  // No valid authentication found
  return res.status(401).json({ 
    error: 'Authentication required. Please log in.',
    authRequired: true 
  });
}

/**
 * Get the current user ID from request
 * Works with both session and token authentication
 */
export function getUserId(req) {
  if (req.session && req.session.userId) {
    return req.session.userId;
  }
  if (req.user && req.user.userId) {
    return req.user.userId;
  }
  return null;
}

/**
 * Get the current user's full info from request
 * Works with both session and token authentication
 */
export function getUserInfo(req) {
  if (req.session && req.session.userId) {
    return {
      userId: req.session.userId,
      email: req.session.email,
      username: req.session.username,
      role: req.session.role,
    };
  }
  if (req.user) {
    return {
      userId: req.user.userId,
      email: req.user.email,
      username: req.user.username,
      role: req.user.role,
    };
  }
  return null;
}

export default { requireAuth, getUserId, getUserInfo };
