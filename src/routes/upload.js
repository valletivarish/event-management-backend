import express from 'express';
import { uploadImage } from '../controllers/uploadController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { upload } from '../utils/upload.js';

const router = express.Router();

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
    }
    if (err.message && err.message.includes('Invalid file type')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(400).json({ error: err.message || 'File upload error' });
  }
  next();
};

router.post('/image', authenticate, requireAdmin, upload.single('image'), handleMulterError, uploadImage);

export default router;

