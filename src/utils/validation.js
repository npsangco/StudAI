/**
 * Input Validation Utilities
 * 
 * This module provides comprehensive validation functions for user inputs
 * across the application. All validations return { isValid: boolean, error: string }
 */

// Email validation
export const validateEmail = (email) => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  if (email.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }
  
  return { isValid: true, error: '' };
};

// Username validation
export const validateUsername = (username) => {
  if (!username || username.trim() === '') {
    return { isValid: false, error: 'Username is required' };
  }
  
  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (username.length > 30) {
    return { isValid: false, error: 'Username must not exceed 30 characters' };
  }
  
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, hyphens and underscores' };
  }
  
  return { isValid: true, error: '' };
};

// Password validation
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }
  
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return { 
      isValid: false, 
      error: 'Password must include uppercase, lowercase, number and special character (@$!%*?&)' 
    };
  }
  
  return { isValid: true, error: '' };
};

// Confirm password validation
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  
  return { isValid: true, error: '' };
};

// Birthday validation
export const validateBirthday = (month, day, year) => {
  if (!month || !day || !year) {
    return { isValid: false, error: 'Please select your complete birthday' };
  }
  
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  
  // Check if date is valid
  if (birthDate.getMonth() + 1 !== parseInt(month) || 
      birthDate.getDate() !== parseInt(day) ||
      birthDate.getFullYear() !== parseInt(year)) {
    return { isValid: false, error: 'Invalid date selected' };
  }
  
  // Check if date is in the future
  if (birthDate > today) {
    return { isValid: false, error: 'Birthday cannot be in the future' };
  }
  
  // Check minimum age (13 years old)
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  
  const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
  
  if (actualAge < 13) {
    return { isValid: false, error: 'You must be at least 13 years old to sign up' };
  }
  
  // Check maximum age (120 years old)
  if (actualAge > 120) {
    return { isValid: false, error: 'Please enter a valid birthday' };
  }
  
  return { isValid: true, error: '' };
};

// Terms acceptance validation
export const validateTermsAcceptance = (accepted) => {
  if (!accepted) {
    return { isValid: false, error: 'You must accept the Terms and Conditions to continue' };
  }
  
  return { isValid: true, error: '' };
};

// Quiz title validation
export const validateQuizTitle = (title) => {
  if (!title || title.trim() === '') {
    return { isValid: false, error: 'Quiz title is required' };
  }
  
  if (title.length > 200) {
    return { isValid: false, error: 'Quiz title must not exceed 200 characters' };
  }
  
  return { isValid: true, error: '' };
};

// Note title validation
export const validateNoteTitle = (title) => {
  if (!title || title.trim() === '') {
    return { isValid: false, error: 'Note title is required' };
  }
  
  if (title.length > 200) {
    return { isValid: false, error: 'Note title must not exceed 200 characters' };
  }
  
  return { isValid: true, error: '' };
};

// Note content validation
export const validateNoteContent = (content) => {
  if (!content || content.trim() === '') {
    return { isValid: false, error: 'Note content is required' };
  }
  
  if (content.length > 50000) {
    return { isValid: false, error: 'Note content is too long (max 50,000 characters)' };
  }
  
  return { isValid: true, error: '' };
};

// File validation
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 25 * 1024 * 1024, // 25MB default
    allowedTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    allowedExtensions = ['.pdf', '.ppt', '.pptx']
  } = options;
  
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }
  
  // Check file size
  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: `File size must not exceed ${Math.round(maxSize / (1024 * 1024))}MB` 
    };
  }
  
  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}` 
    };
  }
  
  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
  
  if (!hasValidExtension) {
    return { 
      isValid: false, 
      error: `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}` 
    };
  }
  
  return { isValid: true, error: '' };
};

// Sanitize string input (remove potentially dangerous characters)
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets to prevent HTML injection
    .substring(0, 10000); // Limit length
};

// Validate and sanitize search query
export const validateSearchQuery = (query) => {
  if (!query || query.trim() === '') {
    return { isValid: false, error: 'Search query is required' };
  }
  
  if (query.length > 200) {
    return { isValid: false, error: 'Search query is too long' };
  }
  
  const sanitized = sanitizeString(query);
  
  return { isValid: true, error: '', sanitized };
};

// Validate numeric ID
export const validateNumericId = (id, fieldName = 'ID') => {
  const numId = parseInt(id);
  
  if (isNaN(numId) || numId <= 0) {
    return { isValid: false, error: `Invalid ${fieldName}` };
  }
  
  return { isValid: true, error: '', value: numId };
};

// Validate date string
export const validateDateString = (dateString) => {
  if (!dateString) {
    return { isValid: false, error: 'Date is required' };
  }
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }
  
  return { isValid: true, error: '', value: date };
};
