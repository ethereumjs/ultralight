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
        url: 'http://192.168.0.194:8080',
        cleartext: true
      }
    };
    break;
  default:
    config = baseConfig
    break;
}

export default config;
