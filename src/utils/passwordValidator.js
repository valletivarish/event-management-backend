// Password strength validation utility
// Weak Password Policy: insecure systems accept easily guessable passwords
// Secure: enforce strong password requirements to prevent brute force attacks

const commonWeakPasswords = [
  'password',
  'password123',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'password1',
  'admin',
  'letmein',
  'welcome',
  'monkey',
  '1234567890',
  'dragon',
  'master',
  'sunshine',
  'princess',
  'football',
  'iloveyou'
];

export function validatePasswordStrength(password) {
  const errors = [];

  // Minimum length requirement
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Maximum length (prevent DoS attacks)
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special character
  // eslint-disable-next-line no-useless-escape
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }

  // Check against common weak passwords
  const lowerPassword = password.toLowerCase();
  if (commonWeakPasswords.some(weak => lowerPassword.includes(weak.toLowerCase()))) {
    errors.push('Password is too common or easily guessable. Please choose a stronger password');
  }

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters (e.g., aaa, 111)');
  }

  // Check for sequential characters
  if (/123|abc|qwe|asd|zxc/i.test(password)) {
    errors.push('Password should not contain sequential characters (e.g., 123, abc)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

