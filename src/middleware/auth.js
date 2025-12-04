import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const authenticate = async (req, res, next) => {
  // Broken Authentication: insecure systems use weak tokens or store tokens in localStorage
  // Secure: JWT in HttpOnly cookies prevents XSS token theft
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
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
    
    // If token version doesn't match, token is invalid (email/password was changed)
    if (tokenVersion !== currentTokenVersion) {
      return res.status(401).json({ error: 'Token invalidated. Please login again.' });
    }
    
    // Verify email still matches (additional security check)
    if (decoded.email !== user.email) {
      return res.status(401).json({ error: 'Token invalidated. Please login again.' });
    }
    
    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (req, res, next) => {
  // Missing RBAC: insecure systems allow users to access admin routes
  // Secure: role-based access control middleware checks user role
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

