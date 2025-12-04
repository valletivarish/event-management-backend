import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { logActivity } from '../services/logService.js';
import { validatePasswordStrength } from '../utils/passwordValidator.js';

/**
 * User Registration Endpoint
 * 
 * Allows new users to create an account with proper validation and security measures.
 */
export const register = [
  // Validate input fields: name, email, and password
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  async (req, res, next) => {
    // Missing Input Validation Vulnerability: insecure systems accept arbitrary data without validation
    // This allows attackers to send malicious or malformed data
    // Secure Solution: express-validator validates all inputs before processing
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Weak Password Policy Vulnerability: insecure systems accept easily guessable passwords
    // This allows attackers to brute force user accounts
    // Secure Solution: enforce strong password requirements to prevent brute force attacks
    const passwordValidation = validatePasswordStrength(req.body.password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        errors: passwordValidation.errors.map(error => ({ msg: error }))
      });
    }

    try {
      const { name, email, password } = req.body;

      // Plaintext Password Storage Vulnerability: insecure systems store passwords without hashing
      // If database is compromised, all passwords are exposed
      // Secure Solution: bcrypt hashes passwords before storage (includes automatic salting)
      const hashedPassword = await bcrypt.hash(password, 10);

      // SQL Injection: insecure code would concatenate user input directly into SQL
      // Secure: parameterized queries prevent SQL injection
      const [result] = await pool.execute(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, hashedPassword]
      );

      // Log the registration activity for audit purposes
      await logActivity(result.insertId, 'user_registered', 'user', result.insertId, 'New user registered', req.ip);

      res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
      next(error);
    }
  }
];

/**
 * User Login Endpoint
 * 
 * Authenticates users and provides them with a secure JWT token for subsequent requests.
 */
export const login = [
  // Validate email and password are provided
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res, next) => {
    // Missing Input Validation Vulnerability: insecure systems accept arbitrary data without validation
    // Secure Solution: express-validator validates all inputs before processing
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      // SQL Injection: insecure code would concatenate user input directly into SQL
      // Secure: parameterized queries prevent SQL injection
      const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
      if (users.length === 0) {
        // Don't reveal whether email exists - same error for both invalid email and password
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];
      // Compare provided password with stored hash using bcrypt
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Token Invalidation Vulnerability: insecure systems don't invalidate tokens when credentials change
      // Old tokens remain valid even after password/email changes, allowing unauthorized access
      // Secure Solution: include token_version in JWT to invalidate tokens when email/password changes
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, tokenVersion: user.token_version || 0 },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // CSRF Attack Vulnerability: insecure systems allow cross-site actions without protection
      // Broken Cookie Security Vulnerability: insecure systems use non-HttpOnly cookies or missing SameSite
      // Attackers can steal tokens via XSS or perform actions via CSRF
      // Secure Solution: HttpOnly and SameSite=strict cookies prevent XSS and CSRF attacks
      res.cookie('token', token, {
        httpOnly: true, // JavaScript cannot access cookie (prevents XSS token theft)
        secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
        sameSite: 'strict', // Cookie only sent on same-site requests (prevents CSRF)
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      // Log the login activity
      await logActivity(user.id, 'user_login', 'user', user.id, 'User logged in', req.ip);

      res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      next(error);
    }
  }
];

/**
 * User Logout Endpoint
 * 
 * Clears the authentication token cookie, effectively logging the user out.
 */
export const logout = (req, res) => {
  // Remove the authentication cookie
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
};

