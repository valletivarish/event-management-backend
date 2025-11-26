import { logActivity } from '../services/logService.js';

export const uploadImage = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  logActivity(req.user.id, 'image_uploaded', 'upload', null, `Image uploaded: ${req.file.filename}`, req.ip);

  res.json({ imageUrl });
};

