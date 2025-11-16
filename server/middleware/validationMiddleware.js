/**
 * Backend Validation Middleware
 * 
 * Provides comprehensive input validation for all API endpoints.
 * Validates and sanitizes user inputs to prevent security vulnerabilities.
 */

import validator from 'validator';

// Email validation
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }
  
  const trimmedEmail = email.trim();
  
  if (!validator.isEmail(trimmedEmail)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  if (trimmedEmail.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }
  
  return { isValid: true, sanitized: validator.normalizeEmail(trimmedEmail) };
};

// Username validation
export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3 || trimmed.length > 30) {
    return { isValid: false, error: 'Username must be between 3 and 30 characters' };
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, hyphens and underscores' };
  }
  
  return { isValid: true, sanitized: trimmed };
};

// Password validation
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8 || password.length > 128) {
    return { isValid: false, error: 'Password must be between 8 and 128 characters' };
  }
  
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  
  if (!passwordRegex.test(password)) {
    return { 
      isValid: false, 
      error: 'Password must include uppercase, lowercase, number and special character' 
    };
  }
  
  return { isValid: true };
};

// Birthday validation
export const validateBirthday = (birthday) => {
  if (!birthday || typeof birthday !== 'string') {
    return { isValid: false, error: 'Birthday is required' };
  }
  
  if (!validator.isDate(birthday)) {
    return { isValid: false, error: 'Invalid date format' };
  }
  
  const birthDate = new Date(birthday);
  const today = new Date();
  
  if (birthDate > today) {
    return { isValid: false, error: 'Birthday cannot be in the future' };
  }
  
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
  
  if (actualAge < 13) {
    return { isValid: false, error: 'You must be at least 13 years old' };
  }
  
  if (actualAge > 120) {
    return { isValid: false, error: 'Invalid birthday' };
  }
  
  return { isValid: true, sanitized: birthday };
};

// Terms acceptance validation
export const validateTermsAcceptance = (acceptedTerms) => {
  if (acceptedTerms !== true) {
    return { isValid: false, error: 'You must accept the Terms and Conditions' };
  }
  
  return { isValid: true };
};

// String sanitization
export const sanitizeString = (str, maxLength = 10000) => {
  if (typeof str !== 'string') return '';
  
  return validator.escape(str.trim()).substring(0, maxLength);
};

// Numeric ID validation
export const validateNumericId = (id) => {
  const numId = parseInt(id);
  
  if (isNaN(numId) || numId <= 0) {
    return { isValid: false, error: 'Invalid ID' };
  }
  
  return { isValid: true, value: numId };
};

// Title validation (for notes, quizzes, etc.)
export const validateTitle = (title, maxLength = 200) => {
  if (!title || typeof title !== 'string') {
    return { isValid: false, error: 'Title is required' };
  }
  
  const trimmed = title.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Title cannot be empty' };
  }
  
  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Title must not exceed ${maxLength} characters` };
  }
  
  return { isValid: true, sanitized: sanitizeString(trimmed, maxLength) };
};

// Content validation (for notes, descriptions, etc.)
export const validateContent = (content, maxLength = 50000) => {
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'Content is required' };
  }
  
  const trimmed = content.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Content cannot be empty' };
  }
  
  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Content must not exceed ${maxLength} characters` };
  }
  
  return { isValid: true, sanitized: trimmed };
};

// Middleware: Validate signup request
export const validateSignupRequest = (req, res, next) => {
  const { email, username, password, birthday, acceptedTerms } = req.body;
  
  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    return res.status(400).json({ error: emailValidation.error });
  }
  
  // Validate username
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.isValid) {
    return res.status(400).json({ error: usernameValidation.error });
  }
  
  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ error: passwordValidation.error });
  }
  
  // Validate birthday
  const birthdayValidation = validateBirthday(birthday);
  if (!birthdayValidation.isValid) {
    return res.status(400).json({ error: birthdayValidation.error });
  }
  
  // Validate terms acceptance
  const termsValidation = validateTermsAcceptance(acceptedTerms);
  if (!termsValidation.isValid) {
    return res.status(400).json({ error: termsValidation.error });
  }
  
  // Attach sanitized values
  req.validatedData = {
    email: emailValidation.sanitized,
    username: usernameValidation.sanitized,
    password: password,
    birthday: birthdayValidation.sanitized
  };
  
  next();
};

// Middleware: Validate login request
export const validateLoginRequest = (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  if (!password || typeof password !== 'string' || password === '') {
    return res.status(400).json({ error: 'Password is required' });
  }
  
  // Validate email format
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    return res.status(400).json({ error: emailValidation.error });
  }
  
  req.validatedData = {
    email: emailValidation.sanitized,
    password: password
  };
  
  next();
};

// Middleware: Validate note creation/update
export const validateNoteRequest = (req, res, next) => {
  const { title, content, category_id } = req.body;
  
  const titleValidation = validateTitle(title);
  if (!titleValidation.isValid) {
    return res.status(400).json({ error: titleValidation.error });
  }
  
  if (content !== undefined && content !== null) {
    const contentValidation = validateContent(content);
    if (!contentValidation.isValid) {
      return res.status(400).json({ error: contentValidation.error });
    }
    req.validatedData = { ...req.validatedData, content: contentValidation.sanitized };
  }
  
  if (category_id) {
    const categoryValidation = validateNumericId(category_id);
    if (!categoryValidation.isValid) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    req.validatedData = { ...req.validatedData, category_id: categoryValidation.value };
  }
  
  req.validatedData = { ...req.validatedData, title: titleValidation.sanitized };
  
  next();
};

// Middleware: Validate quiz creation/update
export const validateQuizRequest = (req, res, next) => {
  const { title, description } = req.body;
  
  const titleValidation = validateTitle(title);
  if (!titleValidation.isValid) {
    return res.status(400).json({ error: titleValidation.error });
  }
  
  req.validatedData = { title: titleValidation.sanitized };
  
  if (description) {
    const descValidation = validateContent(description, 1000);
    if (!descValidation.isValid) {
      return res.status(400).json({ error: descValidation.error });
    }
    req.validatedData.description = descValidation.sanitized;
  }
  
  next();
};

// Middleware: Validate profile update
export const validateProfileUpdate = (req, res, next) => {
  const { username, password, birthday, profile_picture } = req.body;

  if (username) {
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return res.status(400).json({ error: usernameValidation.error });
    }
    req.validatedData = { ...req.validatedData, username: usernameValidation.sanitized };
  }

  if (password) {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }
    req.validatedData = { ...req.validatedData, password };
  }

  if (birthday) {
    const birthdayValidation = validateBirthday(birthday);
    if (!birthdayValidation.isValid) {
      return res.status(400).json({ error: birthdayValidation.error });
    }
    req.validatedData = { ...req.validatedData, birthday: birthdayValidation.sanitized };
  }

  if (profile_picture) {
    // Validate profile picture is a string path
    if (typeof profile_picture !== 'string' || profile_picture.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid profile picture' });
    }
    // Basic validation: should start with / or http
    const trimmed = profile_picture.trim();
    if (!trimmed.startsWith('/') && !trimmed.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid profile picture URL' });
    }
    req.validatedData = { ...req.validatedData, profile_picture: trimmed };
  }

  next();
};

export default {
  validateSignupRequest,
  validateLoginRequest,
  validateNoteRequest,
  validateQuizRequest,
  validateProfileUpdate,
  validateEmail,
  validateUsername,
  validatePassword,
  validateBirthday,
  validateTitle,
  validateContent,
  validateNumericId,
  sanitizeString
};
