import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ultralight.app',
  appName: 'Ultralight',
  webDir: 'public',
  bundledWebRuntime: false,
  server: {
    url: 'http://[webpack dev server address]',
    cleartext: true
  }
};

export default config;
