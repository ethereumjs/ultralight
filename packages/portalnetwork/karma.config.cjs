module.exports = function (config) {
  config.set({
    frameworks: ['tap', 'karma-typescript'],
    files: ['src/**/*.ts', 'test/client/client.spec.ts', 'test/wire/*.ts'],
    preprocessors: {
      '**/*.ts': 'karma-typescript',
    },
    reporters: ['progress'],
    karmaTypescriptConfig: {
      bundlerOptions: {
        entrypoints: /\.spec\.ts$/,
        acornOptions: {
          ecmaVersion: 11,
        },
        sourceMap: true,
        transforms: [
          require('karma-typescript-es6-transform')({
            presets: [
              [
                '@babel/preset-env',
                { exclude: ['@babel/plugin-transform-exponentiation-operator'], loose: true },
              ],
            ],
          }),
        ],
      },
      tsconfig: './tsconfig.browser.json',
    },
    browsers: ['ChromeHeadless'],
    singleRun: true,
    // Fail after timeout
    browserDisconnectTimeout: 100000,
    browserNoActivityTimeout: 100000,
  })
}
