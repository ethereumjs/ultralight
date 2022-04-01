import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ultralight.app',
  appName: 'mobile-client',
  webDir: 'build',
  bundledWebRuntime: false,
  server: {
    url: "192.168.0.194:3000",
    cleartext: true
  }
};

export default config;
