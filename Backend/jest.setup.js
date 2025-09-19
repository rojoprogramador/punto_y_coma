// Jest setup file for test environment
require('dotenv').config({ path: '.env.test' });

// Set test environment variables if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./test.db';
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-for-jest';
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Increase timeout for database operations
jest.setTimeout(30000);