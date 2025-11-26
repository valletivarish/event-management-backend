import express from 'express';
import { getProfile, updateProfile, changePassword } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);

export default router;

