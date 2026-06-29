// Runs before any module (incl. config/env.js) is imported by a test file.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test_jwt_secret_at_least_32_chars_long_000';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
