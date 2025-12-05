// Test setup file
import { vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.AI_SUMMARY_DAILY_LIMIT = '2';
process.env.AI_QUIZ_DAILY_LIMIT = '1';
process.env.AI_CHATBOT_TOKEN_LIMIT = '5000';
process.env.AI_QUIZ_COOLDOWN_DAYS = '2';
process.env.SESSION_SECRET = 'test-secret';
process.env.JWT_SECRET = 'test-jwt-secret';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
};

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
