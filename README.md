# Secure Event Booking & Management System - Backend

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Security Features](#security-features)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [Code Quality & Security](#code-quality--security)
- [Testing](#testing)
- [Directory Structure](#directory-structure)
- [Contributing](#contributing)

## Overview

This is the backend API server for a secure event booking and management system. Built with Node.js, Express, and MySQL, it provides a RESTful API for managing events, bookings, users, and reviews. The system is designed with security as a primary focus, implementing best practices to prevent common web vulnerabilities.

The backend handles user authentication, authorization, event management, booking processing, review moderation, and comprehensive activity logging. All API endpoints are secured with proper authentication and role-based access control.

## Features

### User Management
- User registration with email validation
- Secure login with JWT token authentication
- Password hashing using bcrypt
- Profile management (update name, email, password)
- Token invalidation on credential changes

### Event Management
- Create, read, update, and delete events
- Category-based event organization
- Event capacity and seat management
- Multiple ticket types with pricing
- Event image uploads
- Search and filter functionality

### Booking System
- Book events with ticket type selection
- Quantity-based booking with price calculation
- Automatic seat availability updates
- Booking cancellation with seat restoration
- Transaction-based booking processing

### Review System
- Users can submit reviews and ratings
- Admin review moderation (approve/reject)
- Approved reviews display on event pages
- One review per user per event

### Admin Features
- Complete event and category management
- View all bookings across all users
- Moderate user reviews
- View comprehensive activity logs
- System-wide oversight capabilities

### Activity Logging
- Comprehensive activity tracking
- User action logging with IP addresses
- Resource-based activity tracking
- Paginated log viewing for admins

## Security Features

This system implements security measures to address the OWASP Top 10 vulnerabilities:

### 1. SQL Injection Prevention
- All database queries use parameterized statements
- User input is never directly concatenated into SQL queries
- Dynamic SQL construction uses parameter arrays

### 2. Password Security
- Passwords are hashed using bcrypt with salt rounds
- Plaintext passwords are never stored in the database
- Password changes invalidate all existing tokens

### 3. Authentication Security
- JWT tokens stored in HttpOnly cookies
- Token versioning system invalidates tokens on credential changes
- Email verification in token validation
- Secure token expiration handling

### 4. Role-Based Access Control (RBAC)
- Admin-only routes protected with middleware
- Role verification on sensitive operations
- User and admin role separation

### 5. Insecure Direct Object Reference (IDOR) Prevention
- Ownership checks before resource access
- Users can only access their own bookings and reviews
- Admin override for management operations

### 6. Input Validation
- All user inputs validated using express-validator
- Email format validation and normalization
- Type checking for numeric inputs
- Length and range validation

### 7. CSRF Protection
- SameSite=strict cookie attribute
- Prevents cross-site cookie transmission
- Protects against CSRF attacks

### 8. Cookie Security
- HttpOnly flag prevents JavaScript access
- Secure flag in production environments
- SameSite protection against CSRF

### 9. Error Information Leakage Prevention
- Generic error messages returned to clients
- Detailed errors logged server-side only
- No stack traces or SQL errors exposed
- Proper error status codes

### 10. File Upload Security
- File type validation (images only)
- File size limits (5MB maximum)
- Secure filename generation
- MIME type verification

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd event-management-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   
   Create a `.env` file in the root directory:
   ```env
   DB_HOST=localhost
   DB_USER=your_mysql_username
   DB_PASS=your_mysql_password
   DB_NAME=event_management
   JWT_SECRET=your_secret_jwt_key_here
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start MySQL server**
   
   Ensure MySQL is running on your system

5. **Run the application**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

6. **Database initialization**
   
   The database and tables are automatically created on first run. Default users and mock data are also seeded.

### Environment Variables

- `DB_HOST`: MySQL server host (default: localhost)
- `DB_USER`: MySQL username
- `DB_PASS`: MySQL password
- `DB_NAME`: Database name (default: event_management)
- `JWT_SECRET`: Secret key for JWT token signing (required)
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment mode (development/production)
- `FRONTEND_URL`: Frontend application URL for CORS

### Available Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with auto-reload
- `npm run lint` - Run ESLint to check code quality and style

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### User Endpoints

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Change password

### Event Endpoints

- `GET /api/events` - Get all events (supports search and filter)
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create event (admin only)
- `PUT /api/events/:id` - Update event (admin only)
- `DELETE /api/events/:id` - Delete event (admin only)

### Category Endpoints

- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category (admin only)
- `PUT /api/categories/:id` - Update category (admin only)
- `DELETE /api/categories/:id` - Delete category (admin only)

### Booking Endpoints

- `POST /api/bookings` - Create booking (authenticated)
- `GET /api/bookings` - Get user bookings (authenticated)
- `DELETE /api/bookings/:id` - Cancel booking (authenticated)

### Review Endpoints

- `POST /api/reviews` - Create review (authenticated)
- `GET /api/reviews/:eventId` - Get event reviews
- `PUT /api/reviews/:id/approve` - Approve review (admin only)
- `PUT /api/reviews/:id/reject` - Reject review (admin only)

### Admin Endpoints

- `GET /api/admin/bookings` - Get all bookings (admin only)
- `GET /api/admin/reviews` - Get all reviews (admin only)
- `GET /api/logs` - Get activity logs (admin only)

### File Upload Endpoints

- `POST /api/upload` - Upload event image (admin only)

Full API documentation with interactive testing available at `/api-docs` when server is running.

## Code Quality & Security

### ESLint

The project uses ESLint for code quality and consistency. Run linting checks with:

```bash
npm run lint
```

ESLint is configured to:
- Enforce JavaScript best practices
- Check for unused variables
- Ensure consistent code style
- Validate Node.js-specific patterns

All code should pass ESLint checks before committing. Unused variables can be prefixed with `_` to indicate intentional non-use.

### npm audit

Regular security audits are performed to check for vulnerable dependencies:

```bash
npm audit
```

To automatically fix vulnerabilities (when possible):

```bash
npm audit fix
```

**Current Status**: All dependencies are secure with no known vulnerabilities.

## Testing

### Manual API Testing

You can test the API endpoints using:

1. **Swagger UI**: Visit `http://localhost:5000/api-docs` when the server is running
2. **Postman**: Import the API endpoints and test with proper authentication
3. **cURL**: Use command-line tools to test endpoints

### Default Test Accounts

The system creates default accounts on initialization:

- **Admin**: `admin@ems.com` / `Admin@2024`
- **User**: `user@ems.com` / `User@2024`

**Note:** These passwords meet the strong password requirements (8+ characters, uppercase, lowercase, number, and special character).

### Testing Authentication

1. Register a new user or use default credentials
2. Login to receive a JWT token in HttpOnly cookie
3. Use authenticated requests for protected endpoints
4. Test token invalidation by changing email or password

### Testing Security Features

- **SQL Injection**: Try injecting SQL in search parameters (should be sanitized)
- **Authentication**: Attempt to access protected routes without token
- **RBAC**: Try accessing admin routes as regular user
- **IDOR**: Attempt to access another user's bookings
- **Input Validation**: Submit invalid data types and formats

## Directory Structure

```
event-management-backend/
├── src/
│   ├── config/
│   │   ├── database.js          # MySQL connection pool
│   │   ├── initDb.js            # Database initialization and seeding
│   │   └── swagger.js           # API documentation configuration
│   ├── controllers/
│   │   ├── adminController.js   # Admin-specific operations
│   │   ├── authController.js    # Authentication endpoints
│   │   ├── bookingController.js # Booking management
│   │   ├── categoryController.js # Category management
│   │   ├── eventController.js   # Event CRUD operations
│   │   ├── logController.js     # Activity log viewing
│   │   ├── reviewController.js  # Review management
│   │   ├── uploadController.js  # File upload handling
│   │   └── userController.js    # User profile management
│   ├── middleware/
│   │   ├── auth.js              # Authentication and authorization
│   │   ├── errorHandler.js      # Global error handling
│   │   ├── optionalAuth.js      # Optional authentication
│   │   └── validateParams.js    # Parameter validation
│   ├── routes/
│   │   ├── admin.js             # Admin routes
│   │   ├── auth.js              # Authentication routes
│   │   ├── bookings.js          # Booking routes
│   │   ├── categories.js        # Category routes
│   │   ├── events.js            # Event routes
│   │   ├── logs.js              # Log routes
│   │   ├── reviews.js           # Review routes
│   │   ├── upload.js            # Upload routes
│   │   └── users.js             # User routes
│   ├── services/
│   │   └── logService.js        # Activity logging service
│   ├── utils/
│   │   ├── logger.js            # Logging utility
│   │   └── upload.js            # File upload configuration
│   └── server.js                # Express app and server setup
├── uploads/                     # Uploaded files directory
├── package.json
├── eslint.config.js             # ESLint configuration
└── README.md
```

## Contributing

### Code Style

- Use ES6+ JavaScript features
- Follow async/await pattern for asynchronous operations
- Use meaningful variable and function names
- Add security documentation comments for security-related code
- Keep functions focused and single-purpose

### Security Guidelines

- Always use parameterized queries for database operations
- Validate all user inputs
- Never expose sensitive information in error messages
- Use secure authentication and authorization patterns
- Follow the security documentation comments as examples

### Adding New Features

1. Create controller functions in appropriate controller file
2. Add routes in the routes directory
3. Apply proper authentication and authorization middleware
4. Add input validation using express-validator
5. Add security documentation comments
6. Update this README if adding new endpoints
7. Run ESLint and fix any issues before committing

### Reporting Issues

When reporting security issues or bugs:
- Provide detailed steps to reproduce
- Include error messages and logs
- Specify environment and version information
- Do not include sensitive data in reports
