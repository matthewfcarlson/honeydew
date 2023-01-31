/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  globals: {
    "ts-jest": {
      tsconfig: "tests/tsconfig.json",
      useESM: true,
    },
  },
  testEnvironment: 'miniflare',
  testRegex: '/tests/.*\\.(test|spec)?\\.(ts|tsx)$',
  collectCoverage: true,
  collectCoverageFrom: [
    "functions/*.ts",
    "functions/database/*.ts",
    "functions/api/*.ts",
    // "src/*.ts"
  ],
  // coverageThreshold: {
  //   global: {
  //     lines: 90
  //   }
  // },
  testEnvironmentOptions: {
    bindings: { KEY: "value" },
    kvNamespaces: ["HONEYDEW"],
    d1Databases: ["__D1_BETA__HONEYDEWSQL"],
    modules: true,
  },
};