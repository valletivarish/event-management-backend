import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { logActivity } from '../services/logService.js';
import { validatePasswordStrength } from '../utils/passwordValidator.js';

export const getProfile = async (req, res, next) => {
  try {
    // SQL Injection: insecure code would concatenate user input directly into SQL
    // Secure: parameterized queries prevent SQL injection
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
    // Missing Input Validation: insecure systems accept arbitrary data without validation
    // Secure: express-validator validates all inputs before processing
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
        // SQL Injection: insecure code would concatenate user input directly into SQL
        // Secure: parameterized queries prevent SQL injection
        const [existing] = await pool.execute('SELECT * FROM users WHERE email = ? AND id != ?', [email, req.user.id]);
        if (existing.length > 0) {
          return res.status(409).json({ error: 'Email already in use' });
        }
        updates.push('email = ?');
        params.push(email);
        // Token Invalidation: increment token_version when email changes to invalidate all existing tokens
        updates.push('token_version = token_version + 1');
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(req.user.id);
      // SQL Injection: insecure code would concatenate user input directly into SQL
      // Secure: parameterized queries prevent SQL injection
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
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  async (req, res, next) => {
    // Missing Input Validation: insecure systems accept arbitrary data without validation
    // Secure: express-validator validates all inputs before processing
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Weak Password Policy: insecure systems accept easily guessable passwords
    // Secure: enforce strong password requirements to prevent brute force attacks
    const passwordValidation = validatePasswordStrength(req.body.newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        errors: passwordValidation.errors.map(error => ({ msg: error }))
      });
    }

    try {
      const { currentPassword, newPassword } = req.body;

      // SQL Injection: insecure code would concatenate user input directly into SQL
      // Secure: parameterized queries prevent SQL injection
      const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = users[0];
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Plaintext Password Storage: insecure systems store passwords without hashing
      // Secure: bcrypt hashes passwords before storage
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      // Token Invalidation: increment token_version when password changes to invalidate all existing tokens
      // SQL Injection: insecure code would concatenate user input directly into SQL
      // Secure: parameterized queries prevent SQL injection
      await pool.execute('UPDATE users SET password = ?, token_version = token_version + 1 WHERE id = ?', [hashedPassword, req.user.id]);

      await logActivity(req.user.id, 'password_changed', 'user', req.user.id, 'Password changed', req.ip);

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }
];

