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
    const os = require('os')
    const interfaces = Object.entries(os.networkInterfaces()) //@ts-ignore
    const address = interfaces.flat(2).filter(entry => entry && entry.hasOwnProperty('family') && entry.family === 'IPv4' && entry.address !== ('127.0.0.1'))[0].address
    config = {
      ...baseConfig,
      webDir: 'public',
      server: {
        url: `http://${address}:8080`,
        cleartext: true
      }
    };
    break;
  default:
    config = baseConfig
    break;
}

export default config;
