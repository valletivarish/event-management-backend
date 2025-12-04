/**
 * Password Strength Validation Utility
 * 
 * This function validates that passwords meet security requirements to prevent
 * brute force attacks and ensure strong password policies.
 * 
 * Requirements:
 * - Minimum 8 characters
 * - Maximum 128 characters (prevents denial of service attacks)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - No repeated characters (e.g., "aaa", "111")
 * - No sequential characters (e.g., "123", "abc")
 * 
 * @param {string} password - The password to validate
 * @returns {Object} - Object with isValid (boolean) and errors (array of error messages)
 */
export function validatePasswordStrength(password) {
  const errors = [];

  // Check minimum length - passwords should be at least 8 characters
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Check maximum length - very long passwords can cause performance issues
  // This prevents potential denial of service attacks
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  // Check for at least one uppercase letter (A-Z)
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for at least one lowercase letter (a-z)
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for at least one number (0-9)
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for at least one special character
  // eslint-disable-next-line no-useless-escape
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }

  // Check for repeated characters - passwords like "aaa" or "111" are too predictable
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters (e.g., aaa, 111)');
  }

  // Check for sequential characters - passwords like "123" or "abc" are too predictable
  if (/123|abc|qwe|asd|zxc/i.test(password)) {
    errors.push('Password should not contain sequential characters (e.g., 123, abc)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

