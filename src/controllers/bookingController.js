import { body, validationResult, query } from 'express-validator';
import pool from '../config/database.js';
import { logActivity } from '../services/logService.js';

export const createBooking = [
  body('event_id').isInt().withMessage('Event ID is required'),
  body('ticket_type_id').optional().isInt(),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { event_id, ticket_type_id, quantity } = req.body;

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        const [events] = await connection.execute('SELECT * FROM events WHERE id = ?', [event_id]);
        if (events.length === 0) {
          await connection.rollback();
          return res.status(404).json({ error: 'Event not found' });
        }

        const event = events[0];
        if (event.available_seats < quantity) {
          await connection.rollback();
          return res.status(400).json({ error: 'Not enough available seats' });
        }

        let price = 0;
        if (ticket_type_id) {
          const [ticketTypes] = await connection.execute('SELECT * FROM ticket_types WHERE id = ? AND event_id = ?', [ticket_type_id, event_id]);
          if (ticketTypes.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Ticket type not found' });
          }

          const ticketType = ticketTypes[0];
          if (ticketType.available_quantity < quantity) {
            await connection.rollback();
            return res.status(400).json({ error: 'Not enough tickets available' });
          }

          price = ticketType.price * quantity;
          await connection.execute(
            'UPDATE ticket_types SET available_quantity = available_quantity - ? WHERE id = ?',
            [quantity, ticket_type_id]
          );
        }

        const totalPrice = price || 0;

        const [result] = await connection.execute(
          'INSERT INTO bookings (user_id, event_id, ticket_type_id, quantity, total_price) VALUES (?, ?, ?, ?, ?)',
          [req.user.id, event_id, ticket_type_id || null, quantity, totalPrice]
        );

        await connection.execute(
          'UPDATE events SET available_seats = available_seats - ? WHERE id = ?',
          [quantity, event_id]
        );

        await connection.commit();
        await logActivity(req.user.id, 'booking_created', 'booking', result.insertId, `Booking created for event ${event_id}`, req.ip);

        res.status(201).json({ message: 'Booking created successfully', bookingId: result.insertId });
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

export const getBookings = [
  query('all').optional().isBoolean(),
  async (req, res, next) => {
    try {
      const showAll = req.query.all === 'true' && req.user.role === 'admin';

      let sql = `
        SELECT b.*, e.title as event_title, e.date as event_date, e.location as event_location,
               tt.type_name as ticket_type_name
        FROM bookings b
        JOIN events e ON b.event_id = e.id
        LEFT JOIN ticket_types tt ON b.ticket_type_id = tt.id
        WHERE 1=1
      `;
      const params = [];

      if (!showAll) {
        // Insecure Direct Object Reference: insecure systems skip ownership checks
        // Secure: users can only access their own bookings unless admin
        sql += ' AND b.user_id = ?';
        params.push(req.user.id);
      }

      sql += ' ORDER BY b.created_at DESC';

      const [bookings] = await pool.execute(sql, params);
      res.json(bookings);
    } catch (error) {
      next(error);
    }
  }
];

export const getBookingById = async (req, res, next) => {
  try {
    let sql = `
      SELECT b.*, e.title as event_title, e.date as event_date, e.location as event_location,
             tt.type_name as ticket_type_name
      FROM bookings b
      JOIN events e ON b.event_id = e.id
      LEFT JOIN ticket_types tt ON b.ticket_type_id = tt.id
      WHERE b.id = ?
    `;
    const params = [req.params.id];

    if (req.user.role !== 'admin') {
      // Insecure Direct Object Reference: insecure systems allow users to access any booking
      // Secure: ownership check ensures users only access their own bookings
      sql += ' AND b.user_id = ?';
      params.push(req.user.id);
    }

    const [bookings] = await pool.execute(sql, params);

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(bookings[0]);
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    let sql = 'SELECT * FROM bookings WHERE id = ?';
    const params = [req.params.id];

    if (req.user.role !== 'admin') {
      sql += ' AND user_id = ?';
      params.push(req.user.id);
    }

    const [bookings] = await pool.execute(sql, params);

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[0];

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', req.params.id]);

      await connection.execute(
        'UPDATE events SET available_seats = available_seats + ? WHERE id = ?',
        [booking.quantity, booking.event_id]
      );

      if (booking.ticket_type_id) {
        await connection.execute(
          'UPDATE ticket_types SET available_quantity = available_quantity + ? WHERE id = ?',
          [booking.quantity, booking.ticket_type_id]
        );
      }

      await connection.commit();
      await logActivity(req.user.id, 'booking_cancelled', 'booking', req.params.id, `Booking cancelled`, req.ip);

      res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

