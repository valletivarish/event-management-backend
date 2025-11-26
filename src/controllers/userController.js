import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { logActivity } from '../services/logService.js';

export const getProfile = async (req, res, next) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = [
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, email } = req.body;
      const updates = [];
      const params = [];

      if (name) {
        updates.push('name = ?');
        params.push(name);
      }

      if (email) {
        const [existing] = await pool.execute('SELECT * FROM users WHERE email = ? AND id != ?', [email, req.user.id]);
        if (existing.length > 0) {
          return res.status(409).json({ error: 'Email already in use' });
        }
        updates.push('email = ?');
        params.push(email);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(req.user.id);
      await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

      await logActivity(req.user.id, 'profile_updated', 'user', req.user.id, 'Profile updated', req.ip);

      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      next(error);
    }
  }
];

export const changePassword = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { currentPassword, newPassword } = req.body;

      const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = users[0];
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

      await logActivity(req.user.id, 'password_changed', 'user', req.user.id, 'Password changed', req.ip);

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }
];

