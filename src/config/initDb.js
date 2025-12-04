import pool from './database.js';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export async function initDatabase() {
  try {
    // First, create database if it doesn't exist
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS
    });
    
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    await connection.end();
    
    // Now create tables
    // Users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        token_version INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add token_version column if it doesn't exist (for existing databases)
    try {
      await pool.execute('ALTER TABLE users ADD COLUMN token_version INT DEFAULT 0');
    } catch (error) {
      // Column already exists, ignore error
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.error('Error adding token_version column:', error);
      }
    }

    // Categories table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Events table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category_id INT,
        date DATETIME NOT NULL,
        location VARCHAR(255) NOT NULL,
        capacity INT NOT NULL,
        available_seats INT NOT NULL,
        image_url VARCHAR(500),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Ticket types table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ticket_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        type_name VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        quantity INT NOT NULL,
        available_quantity INT NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )
    `);

    // Bookings table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        event_id INT NOT NULL,
        ticket_type_id INT,
        quantity INT NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        status ENUM('confirmed', 'cancelled') DEFAULT 'confirmed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE SET NULL
      )
    `);

    // Reviews table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        event_id INT NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )
    `);

    // Activity logs table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(255) NOT NULL,
        resource_type VARCHAR(100),
        resource_id INT,
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create default users if not exists
    const bcrypt = await import('bcrypt');
    // Strong Password Policy: use strong passwords even for test accounts
    // Secure: test accounts use passwords that meet security requirements
    const adminPassword = await bcrypt.default.hash('Admin@2024', 10);
    const userPassword = await bcrypt.default.hash('User@2024', 10);
    
    // Create admin user
    const [adminUsers] = await pool.execute('SELECT * FROM users WHERE email = ?', ['admin@ems.com']);
    if (adminUsers.length === 0) {
      await pool.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Admin User', 'admin@ems.com', adminPassword, 'admin']
      );
      console.log('Admin user created: admin@ems.com / Admin@2024');
    }
    
    // Create regular user
    const [regularUsers] = await pool.execute('SELECT * FROM users WHERE email = ?', ['user@ems.com']);
    if (regularUsers.length === 0) {
      await pool.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Regular User', 'user@ems.com', userPassword, 'user']
      );
      console.log('Regular user created: user@ems.com / User@2024');
    }

    // Get user IDs for mock data
    const [adminResult] = await pool.execute('SELECT id FROM users WHERE email = ?', ['admin@ems.com']);
    const [userResult] = await pool.execute('SELECT id FROM users WHERE email = ?', ['user@ems.com']);
    
    if (adminResult.length > 0 && userResult.length > 0) {
      const adminId = adminResult[0].id;
      const userId = userResult[0].id;

      // Create mock categories
      const [categories] = await pool.execute('SELECT COUNT(*) as count FROM categories');
      if (categories[0].count === 0) {
        await pool.execute(
          'INSERT INTO categories (name, description) VALUES (?, ?)',
          ['Technology', 'Tech conferences and workshops']
        );
        await pool.execute(
          'INSERT INTO categories (name, description) VALUES (?, ?)',
          ['Music', 'Concerts and music festivals']
        );
        await pool.execute(
          'INSERT INTO categories (name, description) VALUES (?, ?)',
          ['Sports', 'Sports events and tournaments']
        );
        console.log('Mock categories created');
      }

      // Get category IDs
      const [techCat] = await pool.execute('SELECT id FROM categories WHERE name = ?', ['Technology']);
      const [musicCat] = await pool.execute('SELECT id FROM categories WHERE name = ?', ['Music']);
      
      // Create mock events (created by admin)
      const [events] = await pool.execute('SELECT COUNT(*) as count FROM events');
      if (events[0].count === 0 && techCat.length > 0 && musicCat.length > 0) {
        const techCatId = techCat[0].id;
        const musicCatId = musicCat[0].id;
        
        // Event 1: Tech Conference
        const event1Date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        const event1DateStr = event1Date.toISOString().slice(0, 19).replace('T', ' ');
        const [event1] = await pool.execute(
          'INSERT INTO events (title, description, category_id, date, location, capacity, available_seats, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            'Tech Innovation Summit 2025',
            'Join us for the biggest technology conference of the year featuring talks on AI, cloud computing, and cybersecurity.',
            techCatId,
            event1DateStr,
            'Convention Center, San Francisco',
            500,
            450,
            adminId
          ]
        );
        
        // Event 2: Music Festival
        const event2Date = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days from now
        const event2DateStr = event2Date.toISOString().slice(0, 19).replace('T', ' ');
        const [event2] = await pool.execute(
          'INSERT INTO events (title, description, category_id, date, location, capacity, available_seats, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            'Summer Music Festival',
            'A weekend of amazing music with top artists from around the world.',
            musicCatId,
            event2DateStr,
            'Central Park, New York',
            1000,
            850,
            adminId
          ]
        );
        
        // Create ticket types for events
        if (event1.insertId) {
          await pool.execute(
            'INSERT INTO ticket_types (event_id, type_name, price, quantity, available_quantity) VALUES (?, ?, ?, ?, ?)',
            [event1.insertId, 'Early Bird', 99.99, 100, 75]
          );
          await pool.execute(
            'INSERT INTO ticket_types (event_id, type_name, price, quantity, available_quantity) VALUES (?, ?, ?, ?, ?)',
            [event1.insertId, 'Regular', 149.99, 300, 300]
          );
          await pool.execute(
            'INSERT INTO ticket_types (event_id, type_name, price, quantity, available_quantity) VALUES (?, ?, ?, ?, ?)',
            [event1.insertId, 'VIP', 299.99, 100, 75]
          );
        }
        
        if (event2.insertId) {
          await pool.execute(
            'INSERT INTO ticket_types (event_id, type_name, price, quantity, available_quantity) VALUES (?, ?, ?, ?, ?)',
            [event2.insertId, 'General Admission', 79.99, 800, 700]
          );
          await pool.execute(
            'INSERT INTO ticket_types (event_id, type_name, price, quantity, available_quantity) VALUES (?, ?, ?, ?, ?)',
            [event2.insertId, 'VIP Pass', 199.99, 200, 150]
          );
        }
        
        console.log('Mock events created');
        
        // Create mock bookings (by regular user)
        if (event1.insertId) {
          const [ticketType1] = await pool.execute('SELECT id FROM ticket_types WHERE event_id = ? AND type_name = ?', [event1.insertId, 'Early Bird']);
          if (ticketType1.length > 0) {
            await pool.execute(
              'INSERT INTO bookings (user_id, event_id, ticket_type_id, quantity, total_price, status) VALUES (?, ?, ?, ?, ?, ?)',
              [userId, event1.insertId, ticketType1[0].id, 2, 199.98, 'confirmed']
            );
            // Update available seats
            await pool.execute('UPDATE events SET available_seats = available_seats - ? WHERE id = ?', [2, event1.insertId]);
            await pool.execute('UPDATE ticket_types SET available_quantity = available_quantity - ? WHERE id = ?', [2, ticketType1[0].id]);
          }
        }
        
        if (event2.insertId) {
          const [ticketType2] = await pool.execute('SELECT id FROM ticket_types WHERE event_id = ? AND type_name = ?', [event2.insertId, 'General Admission']);
          if (ticketType2.length > 0) {
            await pool.execute(
              'INSERT INTO bookings (user_id, event_id, ticket_type_id, quantity, total_price, status) VALUES (?, ?, ?, ?, ?, ?)',
              [userId, event2.insertId, ticketType2[0].id, 1, 79.99, 'confirmed']
            );
            // Update available seats
            await pool.execute('UPDATE events SET available_seats = available_seats - ? WHERE id = ?', [1, event2.insertId]);
            await pool.execute('UPDATE ticket_types SET available_quantity = available_quantity - ? WHERE id = ?', [1, ticketType2[0].id]);
          }
        }
        
        console.log('Mock bookings created');
        
        // Create mock reviews (by regular user)
        if (event1.insertId) {
          await pool.execute(
            'INSERT INTO reviews (user_id, event_id, rating, comment, status) VALUES (?, ?, ?, ?, ?)',
            [userId, event1.insertId, 5, 'Amazing event! Looking forward to attending.', 'approved']
          );
        }
        
        if (event2.insertId) {
          await pool.execute(
            'INSERT INTO reviews (user_id, event_id, rating, comment, status) VALUES (?, ?, ?, ?, ?)',
            [userId, event2.insertId, 4, 'Great music festival, had a wonderful time!', 'approved']
          );
        }
        
        console.log('Mock reviews created');
      }
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

