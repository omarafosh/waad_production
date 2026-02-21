/**
 * Password Policy Validator
 * Contract: USER_API_CONTRACT v1.0
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 digit (0-9)
 * - At least 1 special character (!@#$%^&*...)
 *
 * Usage:
 * import { validatePassword, getPasswordStrength } from 'utils/passwordValidator';
 *
 * const result = validatePassword('MyPassword123!');
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 */

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecialChar: boolean;
}

export const PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  maxLength: 100,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecialChar: true
};

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate password against policy
 * @param {string} password - Password to validate
 * @returns {PasswordValidationResult} { valid: boolean, errors: string[] }
 */
export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];

  if (!password) {
    return { valid: false, errors: ['كلمة المرور مطلوبة'] };
  }

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`كلمة المرور يجب أن تكون ${PASSWORD_POLICY.minLength} أحرف على الأقل`);
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`كلمة المرور يجب أن لا تتجاوز ${PASSWORD_POLICY.maxLength} حرف`);
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)');
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)');
  }

  if (PASSWORD_POLICY.requireDigit && !/\d/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)');
  }

  if (PASSWORD_POLICY.requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*...)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export interface PasswordStrength {
  strength: number;
  label: string;
  color: 'error' | 'warning' | 'info' | 'success';
}

/**
 * Get password strength indicator
 * @param {string} password - Password to evaluate
 * @returns {PasswordStrength} { strength: number (0-100), label: string, color: string }
 */
export const getPasswordStrength = (password: string): PasswordStrength => {
  if (!password) return { strength: 0, label: 'ضعيف جداً', color: 'error' };

  let strength = 0;

  // Length scoring
  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 10;
  if (password.length >= 16) strength += 10;

  // Character type scoring
  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/\d/.test(password)) strength += 15;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 15;

  // Determine label and color
  if (strength <= 40) return { strength, label: 'ضعيف', color: 'error' };
  if (strength <= 60) return { strength, label: 'متوسط', color: 'warning' };
  if (strength <= 80) return { strength, label: 'جيد', color: 'info' };
  return { strength, label: 'قوي جداً', color: 'success' };
};

/**
 * Get password requirements list
 * @returns {string[]} List of password requirements in Arabic
 */
export const getPasswordRequirements = (): string[] => {
  return [
    `${PASSWORD_POLICY.minLength} أحرف على الأقل`,
    'حرف كبير واحد على الأقل (A-Z)',
    'حرف صغير واحد على الأقل (a-z)',
    'رقم واحد على الأقل (0-9)',
    'رمز خاص واحد على الأقل (!@#$%...)'
  ];
};

export interface PasswordChecklist {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasDigit: boolean;
  hasSpecialChar: boolean;
}

/**
 * Check if password meets all requirements (for visual indicators)
 * @param {string} password - Password to check
 * @returns {PasswordChecklist} Object with boolean flags for each requirement
 */
export const getPasswordChecklist = (password: string): PasswordChecklist => {
  return {
    minLength: !!password && password.length >= PASSWORD_POLICY.minLength,
    hasUppercase: !!password && /[A-Z]/.test(password),
    hasLowercase: !!password && /[a-z]/.test(password),
    hasDigit: !!password && /\d/.test(password),
    hasSpecialChar: !!password && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
};

export default {
  PASSWORD_POLICY,
  validatePassword,
  getPasswordStrength,
  getPasswordRequirements,
  getPasswordChecklist
};
