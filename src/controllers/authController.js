import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { logActivity } from '../services/logService.js';

export const register = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  async (req, res, next) => {
    // Missing Input Validation: insecure systems accept arbitrary data without validation
    // Secure: express-validator validates all inputs before processing
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, email, password } = req.body;

      // Plaintext Password Storage: insecure systems store passwords without hashing
      // Secure: bcrypt hashes passwords before storage
      const hashedPassword = await bcrypt.hash(password, 10);

      const [result] = await pool.execute(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, hashedPassword]
      );

      await logActivity(result.insertId, 'user_registered', 'user', result.insertId, 'New user registered', req.ip);

      res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
      next(error);
    }
  }
];

export const login = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // CSRF Attacks: insecure systems allow cross-site actions without protection
      // Secure: SameSite=strict cookies prevent CSRF by blocking cross-site cookie transmission
      // Broken Cookie Security: insecure systems use non-HttpOnly cookies or missing SameSite
      // Secure: HttpOnly and SameSite=strict prevent XSS and CSRF attacks
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });

      await logActivity(user.id, 'user_login', 'user', user.id, 'User logged in', req.ip);

      res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      next(error);
    }
  }
];

export const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
};

