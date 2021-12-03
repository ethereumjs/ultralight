# Ultralight Browser Node

This is a proof of concept that will start an Ultralight portal network client in the browser that leverages a UDP proxy service to connect to other nodes in the network,
## Usage

Run `npm run start-proxy` from the monorepo root to run the UDP proxy.  Optionally pass in your IP address as the first parameter (i.e. `npm run start-proxy -- 192.168.0.100`).  Not doing may prevent other nodes from initiating connections with your client.

`npm run start` to start the browser client.

The `portal` object is exposed in the browser console and can be used to experiment with portal network functionality.  See [the portal network docs](../portalnetwork/docs/modules.md) for API specs





