module.exports = {
  extends: '../../config/eslint.cjs',
  rules: {
    'node/no-unsupported-features/es-syntax': 'off',
  },
  parserOptions: {
    extraFileExtensions: ['.json'],
    sourceType: 'module',
    project: 'tsconfig.lint.json',
  },
}
