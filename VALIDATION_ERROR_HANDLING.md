# Input Validation and Error Handling Documentation

## Overview

This document describes the comprehensive input validation and error handling implemented across the StudAI application to ensure security, data integrity, and user experience.

## Table of Contents

1. [Frontend Validation](#frontend-validation)
2. [Backend Validation](#backend-validation)
3. [Error Handling](#error-handling)
4. [Validation Rules](#validation-rules)
5. [Security Measures](#security-measures)

---

## Frontend Validation

### Location
`src/utils/validation.js`

### Available Validators

#### Email Validation
```javascript
validateEmail(email)
```
**Rules:**
- Required field
- Must match email format (user@domain.com)
- Maximum length: 254 characters
- Returns: `{ isValid: boolean, error: string }`

#### Username Validation
```javascript
validateUsername(username)
```
**Rules:**
- Required field
- Minimum length: 3 characters
- Maximum length: 30 characters
- Allowed characters: letters, numbers, hyphens, underscores
- Pattern: `/^[a-zA-Z0-9_-]+$/`
- Returns: `{ isValid: boolean, error: string }`

#### Password Validation
```javascript
validatePassword(password)
```
**Rules:**
- Required field
- Minimum length: 8 characters
- Maximum length: 128 characters
- Must include:
  - At least one lowercase letter
  - At least one uppercase letter
  - At least one number
  - At least one special character (@$!%*?&)
- Pattern: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/`
- Returns: `{ isValid: boolean, error: string }`

#### Confirm Password Validation
```javascript
validateConfirmPassword(password, confirmPassword)
```
**Rules:**
- Required field
- Must match the password field exactly
- Returns: `{ isValid: boolean, error: string }`

#### Birthday Validation
```javascript
validateBirthday(month, day, year)
```
**Rules:**
- All fields required (month, day, year)
- Must be a valid date
- Cannot be in the future
- Minimum age: 13 years old
- Maximum age: 120 years old
- Returns: `{ isValid: boolean, error: string }`

#### Terms Acceptance Validation
```javascript
validateTermsAcceptance(accepted)
```
**Rules:**
- Must be explicitly set to `true`
- Used for signup to ensure users accept terms and conditions
- Returns: `{ isValid: boolean, error: string }`

#### Title Validation
```javascript
validateQuizTitle(title)
validateNoteTitle(title)
```
**Rules:**
- Required field
- Cannot be empty after trimming
- Maximum length: 200 characters
- Returns: `{ isValid: boolean, error: string }`

#### Content Validation
```javascript
validateNoteContent(content)
```
**Rules:**
- Required field
- Cannot be empty after trimming
- Maximum length: 50,000 characters
- Returns: `{ isValid: boolean, error: string }`

#### File Validation
```javascript
validateFile(file, options)
```
**Options:**
- `maxSize`: Maximum file size in bytes (default: 10MB)
- `allowedTypes`: Array of allowed MIME types
- `allowedExtensions`: Array of allowed file extensions

**Default Document Upload Rules:**
- Max size: 25MB
- Allowed types: application/pdf, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation
- Allowed extensions: .pdf, .ppt, .pptx
- Returns: `{ isValid: boolean, error: string }`

#### Search Query Validation
```javascript
validateSearchQuery(query)
```
**Rules:**
- Required field
- Maximum length: 200 characters
- Automatically sanitized (removes dangerous characters)
- Returns: `{ isValid: boolean, error: string, sanitized: string }`

#### Numeric ID Validation
```javascript
validateNumericId(id, fieldName)
```
**Rules:**
- Must be a valid number
- Must be greater than 0
- Returns: `{ isValid: boolean, error: string, value: number }`

---

## Backend Validation

### Location
`server/middleware/validationMiddleware.js`

### Available Middleware

#### Signup Request Validation
```javascript
validateSignupRequest(req, res, next)
```
**Validates:**
- Email (format, length)
- Username (length, characters)
- Password (strength requirements)
- Birthday (valid date, age restrictions)
- Terms acceptance (must be true)

**Sanitizes:**
- Email (normalized)
- Username (trimmed)
- Birthday (formatted)

**Attached to:** `req.validatedData`

#### Login Request Validation
```javascript
validateLoginRequest(req, res, next)
```
**Validates:**
- Email (format)
- Password (not empty)

**Sanitizes:**
- Email (normalized)

**Attached to:** `req.validatedData`

#### Note Request Validation
```javascript
validateNoteRequest(req, res, next)
```
**Validates:**
- Title (required, length)
- Content (length if provided)
- Category ID (valid number if provided)

**Sanitizes:**
- Title (escaped HTML)
- Content (trimmed)

**Attached to:** `req.validatedData`

#### Quiz Request Validation
```javascript
validateQuizRequest(req, res, next)
```
**Validates:**
- Title (required, length)
- Description (length if provided)

**Sanitizes:**
- Title (escaped HTML)
- Description (escaped HTML)

**Attached to:** `req.validatedData`

#### Profile Update Validation
```javascript
validateProfileUpdate(req, res, next)
```
**Validates:**
- Username (if provided)
- Password (if provided - strength requirements)
- Birthday (if provided - valid date, age)

**Sanitizes:**
- Username (trimmed)
- Birthday (formatted)

**Attached to:** `req.validatedData`

### Usage in Routes

```javascript
// Example: Signup route with validation
import { validateSignupRequest } from './middleware/validationMiddleware.js';

app.post('/api/auth/signup', validateSignupRequest, async (req, res) => {
  const { email, username, password, birthday } = req.validatedData;
  // Use sanitized and validated data
});
```

---

## Error Handling

### Location
`server/middleware/errorHandler.js`

### Custom Error Classes

#### ValidationError
- Status Code: 400
- Used for: Input validation failures

#### AuthenticationError
- Status Code: 401
- Used for: Missing or invalid authentication

#### AuthorizationError
- Status Code: 403
- Used for: Insufficient permissions

#### NotFoundError
- Status Code: 404
- Used for: Resource not found

#### DatabaseError
- Status Code: 500
- Used for: Database operation failures

### Error Handler Middleware

```javascript
errorHandler(err, req, res, next)
```

**Features:**
- Centralized error logging
- Environment-specific responses (dev vs production)
- Automatic handling of common error types:
  - Sequelize validation errors
  - JWT errors
  - Multer file upload errors
  - Database constraint errors
- Prevents exposure of sensitive information in production

### Async Handler Wrapper

```javascript
asyncHandler(fn)
```

**Purpose:** Wraps async route handlers to automatically catch and forward errors to error middleware.

**Usage:**
```javascript
import { asyncHandler } from './middleware/errorHandler.js';

router.get('/notes', asyncHandler(async (req, res) => {
  const notes = await Note.findAll();
  res.json(notes);
}));
```

### 404 Handler

```javascript
notFoundHandler(req, res, next)
```

**Purpose:** Handles requests to undefined routes.
**Returns:** 404 status with error message.

### Request Timeout Handler

```javascript
timeoutHandler(timeout = 30000)
```

**Purpose:** Prevents long-running requests from hanging.
**Default:** 30 seconds timeout.

---

## Validation Rules Summary

### Authentication

| Field | Min Length | Max Length | Special Rules |
|-------|-----------|-----------|---------------|
| Email | - | 254 | Valid email format |
| Username | 3 | 30 | Alphanumeric, hyphens, underscores only |
| Password | 8 | 128 | Must include upper, lower, number, special char |
| Birthday | - | - | Age 13-120, valid date |

### Content

| Field | Min Length | Max Length | Special Rules |
|-------|-----------|-----------|---------------|
| Note Title | 1 | 200 | Required |
| Note Content | 1 | 50,000 | Required |
| Quiz Title | 1 | 200 | Required |
| Quiz Description | 0 | 1,000 | Optional |
| Search Query | 1 | 200 | Auto-sanitized |

### File Uploads

| Type | Max Size | Allowed Formats |
|------|---------|----------------|
| Document Upload | 25MB | PDF, PPT, PPTX |
| Note Attachments | 25MB | PDF, PPT, PPTX |

---

## Security Measures

### Input Sanitization

1. **HTML Escaping**
   - All user-generated text is escaped to prevent XSS attacks
   - Uses `validator.escape()` for backend sanitization

2. **SQL Injection Prevention**
   - Using Sequelize ORM with parameterized queries
   - No raw SQL queries with user input

3. **NoSQL Injection Prevention**
   - Firebase queries use proper escaping
   - No direct concatenation of user input

### Rate Limiting

```javascript
// Already implemented in server.js
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### Session Security

- HttpOnly cookies
- Secure flag in production
- Session expiration
- CSRF protection (recommended to add)

### CORS Configuration

```javascript
cors({
  origin: [process.env.CLIENT_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
})
```

---

## Implementation Checklist

### Frontend ✅

- [x] Email validation with format checking
- [x] Username validation with character restrictions
- [x] Strong password validation with all requirements
- [x] Password confirmation matching
- [x] Birthday validation with age restrictions
- [x] Terms and conditions checkbox on signup (NOT on login)
- [x] Real-time validation feedback
- [x] Sanitization utilities for user inputs
- [x] File upload validation
- [x] Loading states to prevent duplicate submissions

### Backend ✅

- [x] Validation middleware for all user inputs
- [x] Signup request validation (including terms acceptance)
- [x] Login request validation
- [x] Profile update validation
- [x] Note creation/update validation
- [x] Quiz creation/update validation
- [x] Input sanitization using validator library
- [x] SQL injection protection (Sequelize ORM)
- [x] Centralized error handling middleware
- [x] Custom error classes for different scenarios
- [x] Async error handling wrapper
- [x] Request timeout handling
- [x] 404 handler for undefined routes

### Security ✅

- [x] Rate limiting configured
- [x] CORS properly configured
- [x] Session security with HttpOnly cookies
- [x] Password hashing with bcrypt
- [x] Email verification required before login
- [x] JWT token expiration
- [x] Sensitive data sanitization in responses

---

## Testing Recommendations

### Frontend Testing

1. Test all validation functions with edge cases
2. Test form submission with invalid data
3. Test form submission with valid data
4. Test loading states and duplicate submission prevention
5. Test terms checkbox requirement on signup

### Backend Testing

1. Test all endpoints with missing required fields
2. Test all endpoints with invalid data formats
3. Test all endpoints with oversized inputs
4. Test SQL injection attempts
5. Test XSS attack attempts
6. Test rate limiting
7. Test authentication and authorization
8. Test error responses in different environments

### Integration Testing

1. Test full signup flow with validation
2. Test full login flow with validation
3. Test create/update operations with validation
4. Test file upload with various file types and sizes
5. Test concurrent requests

---

## Maintenance

### When Adding New Features

1. **Frontend:**
   - Add validation function to `src/utils/validation.js`
   - Document the validation rules
   - Apply validation in the component before API call

2. **Backend:**
   - Add validation middleware to `server/middleware/validationMiddleware.js`
   - Apply middleware to the route
   - Use `req.validatedData` for sanitized values
   - Wrap async handlers with `asyncHandler`

3. **Error Handling:**
   - Use appropriate custom error classes
   - Log errors with context
   - Return user-friendly error messages

### Regular Reviews

- Review error logs regularly
- Update validation rules based on user feedback
- Test with penetration testing tools
- Keep dependencies updated (especially validator library)
- Review and update this documentation

---

## Contact & Support

For questions or issues regarding validation and error handling:
- Check error logs in production
- Review validation error messages returned to client
- Consult this documentation for validation rules
- Update validation rules as requirements change

---

**Last Updated:** November 15, 2025
**Version:** 1.0.0
