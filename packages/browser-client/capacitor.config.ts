import { CapacitorConfig } from '@capacitor/cli';

let config: CapacitorConfig;

const baseConfig: CapacitorConfig = {
  appId: 'com.ultralight.app',
  appName: 'Ultralight',
  webDir: 'dist',
  bundledWebRuntime: false,
};

switch (process.env.CAP_ENV) {
  case 'liveReload':
    config = {
      ...baseConfig,
      webDir: 'public',
      server: {
        url: 'http://[your webpack dev server address here]',
        cleartext: true
      }
    };
    break;
  default:
    config = baseConfig
    break;
}

export default config;
