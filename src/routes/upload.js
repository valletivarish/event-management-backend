import express from 'express';
import { uploadImage } from '../controllers/uploadController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { upload } from '../utils/upload.js';

const router = express.Router();

router.post('/image', authenticate, requireAdmin, upload.single('image'), uploadImage);

export default router;

