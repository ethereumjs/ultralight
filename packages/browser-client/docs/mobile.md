# Building Ultralight for Mobile

Using the [CapacitorJS framework](https://capacitorjs.com/), the Ultralight Browser client can be packaged into a native app to run on mobile devices.  This is still experimental and liable to break at any point since mobile app development is tricky.

## Mobile App architecture

The mobile app consists of two parts:
1) The React web app (just the `browser-client`) running in a webview
2) A native app container that runs on the device and connects the webview to the local device APIs as needed (the UDP network connector in our case)

The nice part of this for our purposes is that the React web app is the same code as we run for the browser client and Capacitor detects the platform the app is running on (web vs mobile) and selects an appropriate transport layer (websockets for the browser and native app UDP sockets for mobile).

## Setup your environment

- Clone the Ultralight monorepo and run `npm i` from the root directory
- Follow the [Capacitor directions](https://capacitorjs.com/docs/getting-started/environment-setup) for setting up your environment for Android/iOS development
- Start the `browser-client` using `npm run start-browser-client` from the root directory
- Open the [Capacitor configuration](../capacitor.config.ts) and set the IP address for your webpack development server to the lan IP address of your development server
- Change to the `browser-client` directory
- Run `npx cap sync`
- Run `npx cap run android` or `npx cap run ios` and select your device/emulator.  With any luck, the app should open on your device.

## Debugging the mobile app

There are a couple of ways to debug Android apps but far and away the easiest is:
 - Run `npx cap open android` from `[directory root]/packages/browser-client` and then select the "Run" tab on the very bottom left of the Android Studio UI and it will show you all of the debug logs from the app.

 ## Local development notes

 Additional steps are needed to run a local testnet with the mobile client:
 - Start the proxy with `node packages/proxy/dist/index.js --nat=ip --ip=[the local IP address for the PC the proxy is running on]`
 - Run a browser client with `npm run start-browser-client` and enter the above IP address when the browser client starts
