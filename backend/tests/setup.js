// backend/tests/setup.js
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock logger to prevent console spam
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Global test timeout
jest.setTimeout(10000);

// Cleanup after all tests
afterAll(async () => {
  // Close any open connections
  await new Promise(resolve => setTimeout(resolve, 500));
});
