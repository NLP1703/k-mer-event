export default {
  testEnvironment: 'node',
  // Native ESM: no Babel transform. Run with --experimental-vm-modules (see the
  // "test" npm script). Tests live under tests/.
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/env.setup.js'],
  testTimeout: 20000,
  verbose: true,
};
