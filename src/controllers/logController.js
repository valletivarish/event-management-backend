import { query } from 'express-validator';
import pool from '../config/database.js';

export const getLogs = [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const [logs] = await pool.execute(
        `SELECT al.*, u.name as user_name, u.email as user_email
         FROM activity_logs al
         LEFT JOIN users u ON al.user_id = u.id
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      const [count] = await pool.execute('SELECT COUNT(*) as total FROM activity_logs');
      const total = count[0].total;

      res.json({ logs, total, limit, offset });
    } catch (error) {
      next(error);
    }
  }
];

