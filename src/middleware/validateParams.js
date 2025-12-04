import { param, validationResult } from 'express-validator';

// Validate ID parameters to prevent SQL injection through route params
export const validateId = [
  param('id').isInt({ min: 1 }).withMessage('Invalid ID parameter'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateEventId = [
  param('eventId').isInt({ min: 1 }).withMessage('Invalid event ID parameter'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

