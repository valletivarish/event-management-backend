import pool from '../config/database.js';

export const getPendingReviews = async (req, res, next) => {
  try {
    // Missing RBAC: insecure systems allow non-admin users to access admin endpoints
    // Secure: requireAdmin middleware ensures only admin users can access this route
    // SQL Injection: insecure code would concatenate user input directly into SQL
    // Secure: parameterized queries prevent SQL injection
    const [reviews] = await pool.execute(
      `SELECT r.*, u.name as user_name, e.title as event_title
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN events e ON r.event_id = e.id
       WHERE r.status = 'pending'
       ORDER BY r.created_at DESC`
    );

    res.json(reviews);
  } catch (error) {
    next(error);
  }
};

export const getAllBookings = async (req, res, next) => {
  try {
    // Missing RBAC: insecure systems allow non-admin users to access admin endpoints
    // Secure: requireAdmin middleware ensures only admin users can access this route
    // SQL Injection: insecure code would concatenate user input directly into SQL
    // Secure: parameterized queries prevent SQL injection
    const [bookings] = await pool.execute(
      `SELECT b.*, u.name as user_name, u.email as user_email,
              e.title as event_title, e.date as event_date,
              tt.type_name as ticket_type_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN events e ON b.event_id = e.id
       LEFT JOIN ticket_types tt ON b.ticket_type_id = tt.id
       ORDER BY b.created_at DESC`
    );

    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

