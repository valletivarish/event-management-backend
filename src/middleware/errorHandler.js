import { logActivity } from '../services/logService.js';

export const errorHandler = async (err, req, res, _next) => {
  // Error Leakage: insecure systems expose SQL errors or stack traces to users
  // Secure: generic error messages prevent information disclosure
  console.error('Error:', err);

  // Handle multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
  }

  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.errors });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Duplicate entry' });
  }

  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  await logActivity(req.user?.id, 'error', null, null, err.message, req.ip);

  res.status(500).json({ error: 'Internal server error' });
};

