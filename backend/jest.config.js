export default {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.js", "**/*.test.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/server.js",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  moduleFileExtensions: ["js", "json"],
  transform: {},
  verbose: true,
};
