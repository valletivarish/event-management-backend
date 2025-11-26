import { body, validationResult, query } from 'express-validator';
import pool from '../config/database.js';
import { logActivity } from '../services/logService.js';

export const getEvents = [
  query('category').optional().isInt(),
  query('search').optional().trim(),
  async (req, res, next) => {
    try {
      const { category, search } = req.query;
      let sql = `
        SELECT e.*, c.name as category_name, 
               COUNT(DISTINCT b.id) as booking_count
        FROM events e
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN bookings b ON e.id = b.event_id AND b.status = 'confirmed'
        WHERE 1=1
      `;
      const params = [];

      if (category) {
        sql += ' AND e.category_id = ?';
        params.push(category);
      }

      if (search) {
        // SQL Injection: insecure code would concatenate user input: sql += ` AND e.title LIKE '%${search}%'`
        // Secure: parameterized queries prevent SQL injection
        sql += ' AND (e.title LIKE ? OR c.name LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      sql += ' GROUP BY e.id ORDER BY e.date ASC';

      const [events] = await pool.execute(sql, params);
      res.json(events);
    } catch (error) {
      next(error);
    }
  }
];

export const getEventById = async (req, res, next) => {
  try {
    const [events] = await pool.execute(
      'SELECT e.*, c.name as category_name FROM events e LEFT JOIN categories c ON e.category_id = c.id WHERE e.id = ?',
      [req.params.id]
    );

    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const [ticketTypes] = await pool.execute(
      'SELECT * FROM ticket_types WHERE event_id = ?',
      [req.params.id]
    );

    res.json({ ...events[0], ticketTypes });
  } catch (error) {
    next(error);
  }
};

export const createEvent = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().trim(),
  body('category_id').optional().isInt(),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('ticketTypes').isArray().withMessage('Ticket types must be an array'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, description, category_id, date, location, capacity, ticketTypes, image_url } = req.body;

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        const [result] = await connection.execute(
          'INSERT INTO events (title, description, category_id, date, location, capacity, available_seats, image_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [title, description || null, category_id || null, date, location, capacity, capacity, image_url || null, req.user.id]
        );

        const eventId = result.insertId;

        if (ticketTypes && ticketTypes.length > 0) {
          for (const ticketType of ticketTypes) {
            await connection.execute(
              'INSERT INTO ticket_types (event_id, type_name, price, quantity, available_quantity) VALUES (?, ?, ?, ?, ?)',
              [eventId, ticketType.type_name, ticketType.price, ticketType.quantity, ticketType.quantity]
            );
          }
        }

        await connection.commit();
        await logActivity(req.user.id, 'event_created', 'event', eventId, `Event created: ${title}`, req.ip);

        res.status(201).json({ message: 'Event created successfully', eventId });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      next(error);
    }
  }
];

export const updateEvent = [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('category_id').optional().isInt(),
  body('date').optional().isISO8601(),
  body('location').optional().trim().notEmpty(),
  body('capacity').optional().isInt({ min: 1 }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, description, category_id, date, location, capacity } = req.body;
      const eventId = req.params.id;

      const [events] = await pool.execute('SELECT * FROM events WHERE id = ?', [eventId]);
      if (events.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const updates = [];
      const params = [];

      if (title) { updates.push('title = ?'); params.push(title); }
      if (description !== undefined) { updates.push('description = ?'); params.push(description); }
      if (category_id !== undefined) { updates.push('category_id = ?'); params.push(category_id); }
      if (date) { updates.push('date = ?'); params.push(date); }
      if (location) { updates.push('location = ?'); params.push(location); }
      if (capacity) {
        updates.push('capacity = ?');
        updates.push('available_seats = available_seats + (? - capacity)');
        params.push(capacity, capacity);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(eventId);
      await pool.execute(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`, params);

      await logActivity(req.user.id, 'event_updated', 'event', eventId, `Event updated`, req.ip);

      res.json({ message: 'Event updated successfully' });
    } catch (error) {
      next(error);
    }
  }
];

export const deleteEvent = async (req, res, next) => {
  try {
    const [events] = await pool.execute('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await pool.execute('DELETE FROM events WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'event_deleted', 'event', req.params.id, `Event deleted`, req.ip);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};

