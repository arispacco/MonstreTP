module.exports = {
  // Use the Node test environment (avoids DOM-specific testing logic overhead)
  testEnvironment: 'node',
  
  // Clear mock calls and instances before every test
  clearMocks: true,
  
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  
  // An array of regexp pattern strings that are matched against all test paths
  testMatch: [
    '**/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Timeout for long-running tests (e.g. multipart file processing)
  testTimeout: 10000,
};
