module.exports = {
  extends: "../../config/eslint.js",
  ignorePatterns: [".eslintrc.js"],
  rules: {
    // Everything the CLI does is via console
    'no-console': 'off',
  }
}
