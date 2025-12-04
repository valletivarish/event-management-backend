/**
 * File Upload Configuration
 * 
 * Configures multer middleware for secure file uploads with validation.
 * Only allows image files (JPEG, PNG, GIF) up to 5MB in size.
 */
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure where uploaded files are stored
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save files to the uploads directory
    cb(null, path.join(__dirname, '../../uploads/'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename to prevent conflicts and overwrites
    // Uses timestamp + random number + original file extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

/**
 * File Type Validator
 * 
 * Validates that uploaded files are images and match allowed types.
 * Checks both MIME type and file extension for better security.
 */
const fileFilter = (req, file, cb) => {
  // List of allowed image MIME types
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  // List of allowed file extensions
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  // Check both MIME type and extension to prevent file type spoofing
  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true); // File is valid, accept it
  } else {
    // Reject file with clear error message
    const fileType = fileExtension || file.mimetype || 'this file type';
    cb(new Error(`Invalid file type: ${fileType} is not allowed. Only image files (JPEG, PNG, GIF) are accepted.`), false);
  }
};

// Configure multer with storage, file size limit, and file filter
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Maximum file size: 5MB (prevents large file uploads)
  },
  fileFilter: fileFilter
});

