import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { logActivity } from '../services/logService.js';
import { requireAdminRole } from '../utils/authorization.js';

export const getCategories = async (req, res, next) => {
  try {
    // SQL Injection: insecure code would concatenate user input directly into SQL
    // Secure: parameterized queries prevent SQL injection
    const [categories] = await pool.execute('SELECT * FROM categories ORDER BY name ASC');
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

export const createCategory = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('description').optional().trim(),
  async (req, res, next) => {
    // Missing Input Validation: insecure systems accept arbitrary data without validation
    // Secure: express-validator validates all inputs before processing
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, description } = req.body;
      // SQL Injection: insecure code would concatenate user input directly into SQL
      // Secure: parameterized queries prevent SQL injection
      const [result] = await pool.execute(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        [name, description || null]
      );

      await logActivity(req.user.id, 'category_created', 'category', result.insertId, `Category created: ${name}`, req.ip);

      res.status(201).json({ message: 'Category created successfully', categoryId: result.insertId });
    } catch (error) {
      next(error);
    }
  }
];

export const updateCategory = [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  async (req, res, next) => {
    // Missing Input Validation: insecure systems accept arbitrary data without validation
    // Secure: express-validator validates all inputs before processing
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // @PreAuthorize("hasRole('ADMIN')") - Controller-level authorization check
    // Defense-in-depth: Even if middleware is bypassed, this prevents unauthorized access
    if (!requireAdminRole(req, res)) {
      return;
    }

    try {
      const { name, description } = req.body;
      const categoryId = req.params.id;

      // SQL Injection: insecure code would concatenate user input directly into SQL
      // Secure: parameterized queries prevent SQL injection
      const [categories] = await pool.execute('SELECT * FROM categories WHERE id = ?', [categoryId]);
      if (categories.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      const updates = [];
      const params = [];

      if (name) { updates.push('name = ?'); params.push(name); }
      if (description !== undefined) { updates.push('description = ?'); params.push(description); }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(categoryId);
      // SQL Injection: insecure code would concatenate user input directly into SQL
      // Secure: parameterized queries prevent SQL injection
      await pool.execute(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params);

      await logActivity(req.user.id, 'category_updated', 'category', categoryId, `Category updated`, req.ip);

      res.json({ message: 'Category updated successfully' });
    } catch (error) {
      next(error);
    }
  }
];

export const deleteCategory = async (req, res, next) => {
  // @PreAuthorize("hasRole('ADMIN')") - Controller-level authorization check
  // Defense-in-depth: Even if middleware is bypassed, this prevents unauthorized access
  if (!requireAdminRole(req, res)) {
    return;
  }

  try {
    // SQL Injection: insecure code would concatenate user input directly into SQL
    // Secure: parameterized queries prevent SQL injection
    const [categories] = await pool.execute('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // SQL Injection: insecure code would concatenate user input directly into SQL
    // Secure: parameterized queries prevent SQL injection
    await pool.execute('DELETE FROM categories WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'category_deleted', 'category', req.params.id, `Category deleted`, req.ip);

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};

