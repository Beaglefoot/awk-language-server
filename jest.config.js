module.exports = {
  timers: 'fake',
  clearMocks: true,
  globals: {
    'ts-jest': {
      tsConfigFile: 'tsconfig.json',
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  modulePathIgnorePatterns: ['<rootDir>/server/out', '<rootDir>/client/out'],
  transform: {
    '\\.ts$': 'ts-jest',
  },
  testRegex: '\\.test\\.ts$',
}
