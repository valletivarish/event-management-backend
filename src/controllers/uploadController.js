import { logActivity } from '../services/logService.js';

export const uploadImage = (req, res, _next) => {
  // File Upload Risks: insecure systems do not validate file types or sizes
  // Secure: multer middleware validates file type and size before accepting uploads
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  logActivity(req.user.id, 'image_uploaded', 'upload', null, `Image uploaded: ${req.file.filename}`, req.ip);

  res.json({ imageUrl });
};

