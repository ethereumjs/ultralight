# Ultralight Mobile App

This is a proof of concept mobile app that will start an Ultralight portal network client to connect to other nodes in the network and retrieve blocks from the History Network.

## Local Development/Testing

- Follow the [Capacitor Environment](https://capacitorjs.com/docs/getting-started/environment-setup) setup instructions to get everything ready for Android development
- Run `npm i` from the monorepo root to install all dependencies
- Run `npx webpack` to build the react app
- Run `npx cap sync android` to copy the web app to the Android code base
- Run `npx cap run android` and then select your desired device from the list