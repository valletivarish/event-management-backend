import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  // Broken Authentication: insecure systems use weak tokens or store tokens in localStorage
  // Secure: JWT in HttpOnly cookies prevents XSS token theft
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
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

