import express from 'express';
import { getPendingReviews, getAllBookings } from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/reviews/pending', authenticate, requireAdmin, getPendingReviews);
router.get('/bookings', authenticate, requireAdmin, getAllBookings);

export default router;

