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
  collectCoverageFrom: [
    "functions/*.ts",
    // "src/*.ts"
  ],
  testEnvironmentOptions: {
    bindings: { KEY: "value" },
    kvNamespaces: ["HONEYDEW"],
    d1Databases: ["__D1_BETA__HONEYDEWSQL"],
    modules: true,
  },
};