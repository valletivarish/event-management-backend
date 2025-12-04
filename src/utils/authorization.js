/**
 * Authorization Utility Functions
 * 
 * These functions provide controller-level authorization checks, similar to Spring Security's @PreAuthorize.
 * This adds a second layer of security (defense-in-depth) - even if middleware is bypassed,
 * these checks will prevent unauthorized access.
 * 
 * Use these functions at the start of controller methods to ensure proper authorization.
 */

/**
 * Checks if the current user has admin role
 * 
 * This function verifies that the authenticated user is an administrator.
 * Use this in admin-only controller methods for additional security.
 * 
 * @param {Object} req - Express request object (should have req.user set by authenticate middleware)
 * @param {Object} res - Express response object
 * @returns {boolean} - Returns true if user is admin, false otherwise (also sends error response)
 */
export function requireAdminRole(req, res) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }

  const userRole = (req.user.role || '').toLowerCase().trim();
  if (userRole !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }

  return true;
}

/**
 * Checks if the current user is authenticated
 * 
 * This function verifies that a user is logged in.
 * Use this in any controller method that requires authentication.
 * 
 * @param {Object} req - Express request object (should have req.user set by authenticate middleware)
 * @param {Object} res - Express response object
 * @returns {boolean} - Returns true if user is authenticated, false otherwise (also sends error response)
 */
export function requireAuthenticated(req, res) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }

  return true;
}

/**
 * Checks if the current user owns the resource or is an admin
 * 
 * This function allows access if:
 * - The user is an admin, OR
 * - The user owns the resource (their ID matches the resource owner's ID)
 * 
 * Use this when users should only access their own data, but admins can access everything.
 * 
 * @param {Object} req - Express request object (should have req.user set by authenticate middleware)
 * @param {Object} res - Express response object
 * @param {number} resourceUserId - The user ID of the person who owns the resource
 * @returns {boolean} - Returns true if authorized, false otherwise (also sends error response)
 */
export function requireOwnerOrAdmin(req, res, resourceUserId) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }

  const userRole = (req.user.role || '').toLowerCase().trim();
  
  // Admins can access anything
  if (userRole === 'admin') {
    return true;
  }

  // Users can access their own resources
  if (req.user.id === resourceUserId) {
    return true;
  }

  // Otherwise, access denied
  res.status(403).json({ error: 'Access denied' });
  return false;
}

