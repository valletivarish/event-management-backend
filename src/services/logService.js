import pool from '../config/database.js';

export async function logActivity(userId, action, resourceType, resourceId, details, ipAddress) {
  try {
    await pool.execute(
      'INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [userId || null, action, resourceType || null, resourceId || null, details || null, ipAddress || null]
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

