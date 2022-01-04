module.exports = {
  extends: "../../config/eslint.js",
  ignorePatterns: [".eslintrc.js"],
  rules: {
    // Everything the proxy does is console based
    'no-console': 'off',
  }
}
