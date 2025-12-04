import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

/**
 * Authentication Middleware
 * 
 * Broken Authentication Vulnerability: insecure systems use weak tokens or store tokens in localStorage
 * Secure Solution: JWT in HttpOnly cookies prevents XSS token theft
 */
export const authenticate = async (req, res, next) => {
  // Get the authentication token from cookies
  // Broken Authentication Vulnerability: insecure systems store tokens in localStorage (accessible to JavaScript)
  // Secure Solution: HttpOnly cookies prevent JavaScript access, protecting against XSS attacks
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Verify the token signature using our secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Broken Authentication: insecure systems don't verify token validity against current user state
    // Secure: verify token version and email match current user data to prevent use of invalidated tokens
    // SQL Injection: insecure code would concatenate user input directly into SQL
    // Secure: parameterized queries prevent SQL injection
    const [users] = await pool.execute(
      'SELECT id, email, role, token_version FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const user = users[0];
    const currentTokenVersion = user.token_version || 0;
    const tokenVersion = decoded.tokenVersion || 0;
    
    // Token Invalidation Vulnerability: if token version doesn't match, token should be invalid
    // This ensures old tokens can't be used after password/email changes
    if (tokenVersion !== currentTokenVersion) {
      return res.status(401).json({ error: 'Token invalidated. Please login again.' });
    }
    
    // Verify email still matches (additional security check)
    // This provides an extra layer of security in case user email was changed
    if (decoded.email !== user.email) {
      return res.status(401).json({ error: 'Token invalidated. Please login again.' });
    }
    
    // Normalize role to lowercase for consistent comparison (handles case variations)
    const normalizedRole = (user.role || '').toLowerCase().trim();
    req.user = { id: user.id, email: user.email, role: normalizedRole };
    next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Admin Authorization Middleware
 * 
 * Missing RBAC Vulnerability: insecure systems allow users to access admin routes
 * This allows unauthorized users to perform admin operations
 * Secure Solution: role-based access control middleware checks user role
 */
export const requireAdmin = (req, res, next) => {
  // Ensure authenticate middleware was called first
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Missing RBAC Vulnerability: insecure systems don't check user roles
  // Secure Solution: normalize and strictly check role - must be exactly 'admin'
  const userRole = (req.user.role || '').toLowerCase().trim();
  if (userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

