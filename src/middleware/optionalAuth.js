import jwt from 'jsonwebtoken';

// Optional authentication - sets req.user if token is valid, but doesn't require it
export const optionalAuthenticate = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return next(); // Continue without authentication
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (_error) {
    // Invalid token, but continue without authentication
  }
  
  next();
};

