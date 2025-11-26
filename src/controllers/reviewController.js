import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { logActivity } from '../services/logService.js';

export const createReview = [
  body('event_id').isInt().withMessage('Event ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { event_id, rating, comment } = req.body;

      const [events] = await pool.execute('SELECT * FROM events WHERE id = ?', [event_id]);
      if (events.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const [existing] = await pool.execute(
        'SELECT * FROM reviews WHERE user_id = ? AND event_id = ?',
        [req.user.id, event_id]
      );

      if (existing.length > 0) {
        return res.status(409).json({ error: 'Review already exists for this event' });
      }

      const [result] = await pool.execute(
        'INSERT INTO reviews (user_id, event_id, rating, comment, status) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, event_id, rating, comment || null, 'pending']
      );

      await logActivity(req.user.id, 'review_created', 'review', result.insertId, `Review created for event ${event_id}`, req.ip);

      res.status(201).json({ message: 'Review submitted successfully', reviewId: result.insertId });
    } catch (error) {
      next(error);
    }
  }
];

export const getReviews = async (req, res, next) => {
  try {
    const [reviews] = await pool.execute(
      `SELECT r.*, u.name as user_name 
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.event_id = ? AND r.status = 'approved'
       ORDER BY r.created_at DESC`,
      [req.params.eventId]
    );

    res.json(reviews);
  } catch (error) {
    next(error);
  }
};

export const updateReviewStatus = [
  body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { status } = req.body;

      const [reviews] = await pool.execute('SELECT * FROM reviews WHERE id = ?', [req.params.id]);
      if (reviews.length === 0) {
        return res.status(404).json({ error: 'Review not found' });
      }

      await pool.execute('UPDATE reviews SET status = ? WHERE id = ?', [status, req.params.id]);
      await logActivity(req.user.id, 'review_status_updated', 'review', req.params.id, `Review status updated to ${status}`, req.ip);

      res.json({ message: 'Review status updated successfully' });
    } catch (error) {
      next(error);
    }
  }
];

export const deleteReview = async (req, res, next) => {
  try {
    let sql = 'SELECT * FROM reviews WHERE id = ?';
    const params = [req.params.id];

    if (req.user.role !== 'admin') {
      sql += ' AND user_id = ?';
      params.push(req.user.id);
    }

    const [reviews] = await pool.execute(sql, params);

    if (reviews.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    await pool.execute('DELETE FROM reviews WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'review_deleted', 'review', req.params.id, `Review deleted`, req.ip);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    next(error);
  }
};

