module.exports = {
  extends: "../../config/eslint.cjs",
  rules: {
    // Everything the proxy does is console based
    'no-console': 'off',
    'node/no-unsupported-features/es-syntax':'off',
    'no-process-exit':'off'
  }
}
