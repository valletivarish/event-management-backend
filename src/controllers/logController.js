import { query, validationResult } from 'express-validator';
import pool from '../config/database.js';

export const getLogs = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      // Ensure values are valid integers (already validated, but double-check for safety)
      const safeLimit = Math.max(1, Math.min(100, limit));
      const safeOffset = Math.max(0, offset);

      // Use values directly in query since they're validated as integers (safe from SQL injection)
      const [logs] = await pool.execute(
        `SELECT al.*, u.name as user_name, u.email as user_email
         FROM activity_logs al
         LEFT JOIN users u ON al.user_id = u.id
         ORDER BY al.created_at DESC
         LIMIT ${safeLimit} OFFSET ${safeOffset}`
      );

      const [count] = await pool.execute('SELECT COUNT(*) as total FROM activity_logs');
      const total = count[0].total;

      res.json({ logs, total, limit: safeLimit, offset: safeOffset });
    } catch (error) {
      next(error);
    }
  }
];

