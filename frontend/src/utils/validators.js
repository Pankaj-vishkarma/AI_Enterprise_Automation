export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const EMAIL_ERROR = 'Please enter a valid email address';

/** Trim-aware email validation for auth forms. */
export function validateAuthEmail(value) {
  if (value == null || value === '') {
    return 'Email is required';
  }
  if (typeof value !== 'string') {
    return EMAIL_ERROR;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Email is required';
  }
  if (/\s/.test(trimmed)) {
    return EMAIL_ERROR;
  }
  if (!validateEmail(trimmed)) {
    return EMAIL_ERROR;
  }
  return true;
}

/** Password validation for auth forms (trim/space checks + optional strength). */
export function validateAuthPassword(value, { required = true, checkStrength = false } = {}) {
  if (value == null || value === '') {
    return required ? 'Password is required' : true;
  }
  if (typeof value !== 'string') {
    return 'Password is required';
  }
  if (value !== value.trim()) {
    return 'Password cannot contain leading or trailing spaces';
  }
  if (!value.trim()) {
    return 'Password is required';
  }
  if (checkStrength && !validatePassword(value)) {
    return 'Password must be at least 8 characters and include uppercase, lowercase, and a number';
  }
  return true;
}

export const trimAuthEmail = (value) => (typeof value === 'string' ? value.trim() : value);

/** Reject empty and whitespace-only text (spaces, tabs, newlines). */
export function validateRequiredText(value, fieldLabel = 'This field') {
  if (value == null || value === '') {
    return `${fieldLabel} is required`;
  }
  if (typeof value !== 'string') {
    return `${fieldLabel} is required`;
  }
  if (!value.trim()) {
    return `${fieldLabel} is required`;
  }
  return true;
}

export function validateOrganizationName(value) {
  const required = validateRequiredText(value, 'Organization name');
  if (required !== true) return required;
  if (value.trim().length < 2) {
    return 'Organization name must be at least 2 characters';
  }
  return true;
}

export function validateFirstName(value) {
  return validateRequiredText(value, 'First name');
}

export const validatePassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

export const validatePasswordStrength = (password) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[@$!%*?&]/.test(password)) strength++;

  const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return {
    score: strength,
    label: levels[strength],
  };
};

export const validateForm = (data, rules) => {
  const errors = {};

  Object.keys(rules).forEach((field) => {
    const value = data[field];
    const fieldRules = rules[field];

    if (fieldRules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors[field] = `${field} is required`;
    }

    if (fieldRules.email && value && !validateEmail(value)) {
      errors[field] = 'Invalid email address';
    }

    if (fieldRules.minLength && value && value.length < fieldRules.minLength) {
      errors[field] = `${field} must be at least ${fieldRules.minLength} characters`;
    }

    if (fieldRules.maxLength && value && value.length > fieldRules.maxLength) {
      errors[field] = `${field} must not exceed ${fieldRules.maxLength} characters`;
    }

    if (fieldRules.pattern && value && !fieldRules.pattern.test(value)) {
      errors[field] = fieldRules.message || `Invalid ${field}`;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validatePhoneNumber = (phone) => {
  const regex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return regex.test(phone);
};
