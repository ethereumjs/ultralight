# Ultralight - Portal Network Clients in the browser

This monorepo comprises a suite of tools **currently in development** to allow dapps, wallet providers, and really any Javascript based Ethereum application to connect into the Portal Network once development is complete and the Portal Network is live. 

## Quick Start

Clone this repo and run `npm i` from the root directory.  This project leverage [`npm workspaces`](https://docs.npmjs.com/cli/v7/using-npm/workspaces) so requires NPM v7 or above.

- Start the cli - `npm run start-cli` - and press `e` to print the current ENR to the screen.
- Copy this ENR which should start with `enr:-IS...`
- Start the browser client dev server - `npm run start-browser-client` and open a browser window at `localhost:3000`
- Paste the ENR into the `Node ENR` text box and press `Add Node`
- Click `Send Ping` to initiate a connection and you should see something like below in the browser console:
```js
portalnetwork Sending PING to d3507...c38d0 for 0x500a subnetwork +0ms
discv5:service Sent TALKREQ message to node d35070e5b5d54e3b6d8349107b2f39f0dca3f2b01251e400785c0de5ef4c38d0 +14s
discv5:service Sending PING to d35070e5b5d54e3b6d8349107b2f39f0dca3f2b01251e400785c0de5ef4c38d0 +119ms 
```
- In the terminal where the Ultralight-CLI client is running, you should see something like below:
```js
discv5:service Node unknown, requesting ENR. Node: 6a75259ee66cd763534eb8c800f3d336c7e06d3899e3435c64f99bdd7f2be0c0; Token: 47fb31de26bcc9dc13fffbaa +38s
discv5:service Sending PING to 6a75259ee66cd763534eb8c800f3d336c7e06d3899e3435c64f99bdd7f2be0c0 +92ms
discv5:service Received TALKREQ message from Node: 6a75259ee66cd763534eb8c800f3d336c7e06d3899e3435c64f99bdd7f2be0c0 +5ms
```
- Try the other buttons in the browser and see what happens.  (Hint: Enter `03` in the "Content-Key" input and press the "Send Find Content Request")

## Monorepo Structure

### `Discv5`

The `discv5` library is a fork of [Chainsafe's implementation](https://github.com/chainsafe/discv5) that introduces a websocket transport layer to allow browser clients to leverage the discv5 protocol via a websocket to UDP proxy service.  

### `Portalnetwork`

The `portalnetwork` library is the application layer needed to interact with the Portal Network and depends on `discv5` for its networking layer

### `Ultralight-Proxy`

This a simple nodejs server that accepts incoming websocket connections from browser clients and routes their messages on to other Portal Network clients
### `Ultralight-Browser-Client`

This is a technical demonstration of a web application that uses the `portalnetwork` module to connect to the Portal Network

### `CLI`

This is a technical demonstration of a NodeJS application that uses the `portalnetwork` module to connect to the Portal Network

## Development

Use `npm run dev` in both the `discv5` and `portalnetwork` libraries to have Typescript automatically recompile code as changes are made.  

The browser client supports live reload as well as so any changes made in any of the `discv5`, `portalnetwork`, or `browser-client` libraries will result in the browser client reloading.

