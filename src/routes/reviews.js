import express from 'express';
import { createReview, getReviews, updateReviewStatus, deleteReview } from '../controllers/reviewController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, createReview);
router.get('/event/:eventId', getReviews);
router.put('/:id/status', authenticate, requireAdmin, updateReviewStatus);
router.delete('/:id', authenticate, deleteReview);

export default router;

