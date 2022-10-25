/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */

import { JestConfigWithTsJest } from 'ts-jest'

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: "tests",
  roots: [
    "<rootDir>",
    "<rootDir>/../src"
  ],
  testRegex: [".*\\.(spec|test)\\.ts$"],
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", {
      "tsconfig": "tsconfig.test.json"
    }]
  },
  collectCoverageFrom: [
    "**/*.(t|j)s"
  ],
  coverageDirectory: "../coverage",
  setupFiles: [
    "<rootDir>/jest.setup.ts"
  ],
} as JestConfigWithTsJest;
