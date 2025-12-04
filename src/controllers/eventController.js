import { body, validationResult, query } from 'express-validator';
import pool from '../config/database.js';
import { logActivity } from '../services/logService.js';
import { requireAdminRole } from '../utils/authorization.js';

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

/**
 * Get Event by ID
 * 
 * Retrieves a single event with its details and ticket types.
 */
export const getEventById = async (req, res, next) => {
  try {
    // SQL Injection: insecure code would concatenate user input directly into SQL
    // Secure: parameterized queries prevent SQL injection
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

/**
 * Create Event Endpoint (Admin Only)
 * 
 * Creates a new event with ticket types. All inputs are validated before processing.
 */
export const createEvent = [
  // Validate all required and optional fields
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().trim(),
  body('category_id').optional().isInt(),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('ticketTypes').isArray().withMessage('Ticket types must be an array'),
  async (req, res, next) => {
    // Check if input validation passed
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
      const { title, description, category_id, date, location, capacity, ticketTypes, image_url } = req.body;

      // Validate that total ticket quantities don't exceed event capacity
      // This ensures we don't sell more tickets than the venue can hold
      if (ticketTypes && ticketTypes.length > 0) {
        const totalTicketQuantity = ticketTypes.reduce((sum, tt) => sum + (parseInt(tt.quantity) || 0), 0);
        if (totalTicketQuantity > capacity) {
          return res.status(400).json({ 
            error: `Total ticket quantity (${totalTicketQuantity}) cannot exceed event capacity (${capacity})` 
          });
        }
      }

      // Use database transaction to ensure all-or-nothing operation
      // If anything fails, everything rolls back
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // SQL Injection: insecure code would concatenate user input directly into SQL
        // Secure: parameterized queries prevent SQL injection
        const [result] = await connection.execute(
          'INSERT INTO events (title, description, category_id, date, location, capacity, available_seats, image_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [title, description || null, category_id || null, date, location, capacity, capacity, image_url || null, req.user.id]
        );

        const eventId = result.insertId;

        // Insert ticket types for this event
        if (ticketTypes && ticketTypes.length > 0) {
          for (const ticketType of ticketTypes) {
            // SQL Injection: insecure code would concatenate user input directly into SQL
            // Secure: parameterized queries prevent SQL injection
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

/**
 * Update Event Endpoint (Admin Only)
 * 
 * Updates an existing event. All fields are optional - only provided fields will be updated.
 */
export const updateEvent = [
  // Validate optional fields (all fields can be omitted for partial updates)
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('category_id').optional().isInt(),
  body('date').optional().isISO8601(),
  body('location').optional().trim().notEmpty(),
  body('capacity').optional().isInt({ min: 1 }),
  async (req, res, next) => {
    // Check if input validation passed
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
        const { title, description, category_id, date, location, capacity, ticketTypes, image_url } = req.body;
      const eventId = req.params.id;

      // SQL Injection: insecure code would concatenate user input directly into SQL
      // Secure: parameterized queries prevent SQL injection
      const [events] = await pool.execute('SELECT * FROM events WHERE id = ?', [eventId]);
      if (events.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Use new capacity if provided, otherwise keep existing capacity
      const currentCapacity = capacity || events[0].capacity;

      // Validate that total ticket quantities don't exceed event capacity
      // This check only runs if ticket types are being updated
      if (ticketTypes && ticketTypes.length > 0) {
        const totalTicketQuantity = ticketTypes.reduce((sum, tt) => sum + (parseInt(tt.quantity) || 0), 0);
        if (totalTicketQuantity > currentCapacity) {
          return res.status(400).json({ 
            error: `Total ticket quantity (${totalTicketQuantity}) cannot exceed event capacity (${currentCapacity})` 
          });
        }
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
      if (image_url !== undefined) { updates.push('image_url = ?'); params.push(image_url || null); }

      // Check if there are any updates (either event fields or ticket types)
      if (updates.length === 0 && ticketTypes === undefined) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Update event fields if there are any
        if (updates.length > 0) {
          const updateParams = [...params, eventId];
          // SQL Injection: insecure code would concatenate user input directly into SQL
          // Secure: parameterized queries prevent SQL injection
          await connection.execute(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`, updateParams);
        }

        // Update ticket types if provided
        if (ticketTypes !== undefined) {
          // Delete existing ticket types
          // SQL Injection: insecure code would concatenate user input directly into SQL
          // Secure: parameterized queries prevent SQL injection
          await connection.execute('DELETE FROM ticket_types WHERE event_id = ?', [eventId]);

          // Insert new ticket types
          if (ticketTypes && ticketTypes.length > 0) {
            for (const ticketType of ticketTypes) {
              // SQL Injection: insecure code would concatenate user input directly into SQL
              // Secure: parameterized queries prevent SQL injection
              await connection.execute(
                'INSERT INTO ticket_types (event_id, type_name, price, quantity, available_quantity) VALUES (?, ?, ?, ?, ?)',
                [eventId, ticketType.type_name, ticketType.price, ticketType.quantity, ticketType.quantity]
              );
            }
          }
        }

        await connection.commit();
        await logActivity(req.user.id, 'event_updated', 'event', eventId, `Event updated`, req.ip);

        res.json({ message: 'Event updated successfully' });
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

export const deleteEvent = async (req, res, next) => {
  // @PreAuthorize("hasRole('ADMIN')") - Controller-level authorization check
  // Defense-in-depth: Even if middleware is bypassed, this prevents unauthorized access
  if (!requireAdminRole(req, res)) {
    return;
  }

  try {
    // SQL Injection: insecure code would concatenate user input directly into SQL
    // Secure: parameterized queries prevent SQL injection
    const [events] = await pool.execute('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // SQL Injection: insecure code would concatenate user input directly into SQL
    // Secure: parameterized queries prevent SQL injection
    await pool.execute('DELETE FROM events WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'event_deleted', 'event', req.params.id, `Event deleted`, req.ip);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};

