# Ultralight - Portal Network Clients in the browser

This monorepo comprises a suite of tools **currently in development** to allow dapps, wallet providers, and really any Javascript based Ethereum application to connect into the Portal Network once development is complete and the Portal Network is live. 

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

## Usage

Clone this repo and run `npm i` from the root directory.  This project leverage [`npm workspaces`](https://docs.npmjs.com/cli/v7/using-npm/workspaces) so requires NPM v7 or above.

- Start the proxy service - `npm run start-proxy`
- Start the browser client dev server - `npm run start-browser-client`
- Open up 2 browser tabs to `localhost:3000`
- Open one tab and click `Click to Start` to open the node info window and click on the ENR at the top to copy to clipboard
- Open the second tab and paste the ENR into the `Node ENR` input on the right and click `Add Node`
- Click `Send Ping` to initiate a connection and observe the debug logs at the bottom of the screen (or view in the browser console)

## Development

Use `npm run dev` in both the `discv5` and `portalnetwork` libraries to have Typescript automatically recompile code as changes are made.  

The browser client supports live reload as well as so any changes made in any of the `discv5`, `portalnetwork`, or `browser-client` libraries will result in the browser client reloading.

