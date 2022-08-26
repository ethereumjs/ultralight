# Ultralight - Portal Network Clients in the browser

This monorepo comprises a suite of tools **currently in development** to allow dapps, wallet providers, and any Javascript-based Ethereum application to connect to the Portal Network once development is complete, and the Portal Network is live.

## Prequisites

Node v16+, NPM v7+

## Quick Start

Clone this repo and run `npm i` from the root directory.  This project leverages [`npm workspaces`](https://docs.npmjs.com/cli/v7/using-npm/workspaces) so requires NPM v7 or above.

- Start the cli - `npm run start-cli` and you should see some logs like below indicating the node is starting up
```sh
de2f8:ultralight Started JSON RPC Server address=http://localhost:8545
de2f8:discv5:service Updated ENR based on public multiaddr to enr:-IS4QH2xRY1ov...
```
- Copy the node's ENR which should start with `enr:-IS...`
  - Alternatively, retrieve the node's ENR using the JSON-RPC.  Details [here](./packages/cli/README.md)
- Start the browser client dev server - `npm run start-browser-client` and open a browser window at `localhost:8080`
- Click `Start Node`, paste the ENR into the input that says `Node ENR` and press `Connect To Node`
- You should see a node appear in the table on the left side of the page
- In the terminal where the Ultralight-CLI client is running, you should see something like below:
```js
de2f8:portalnetwork Received History Subnetwork request +25s
de2f8:portalnetwork TALKREQUEST with PING message received from b81736575498a5850b0dd52f2695268cf60fe6c89ab74289692c5225c9e4e09e +0ms
de2f8:portalnetwork adding b81736575498a5850b0dd52f2695268cf60fe6c89ab74289692c5225c9e4e09e 
```
- Try retrieving a block from the network.  (Hint: Enter `0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6` - the hash for Block 1 from the Ethereum Mainnet in the input box on the right input and press the "Get Block by Blockhash")

## Connecting to the testnet

1.  Follow the above quickstart guide as far as installing all dependencies.
2.  From the repository root, run `node packages/proxy/dist/index.js --nat=extip`
3.  Run `npm run start-browser-client`
4.  Connect to one of the [Ultralight bootnodes](./packages//cli/bootnodes.txt)
5.  You should start to see the network table populate with additional nodes as the client fills in its routing table
6.  Try and get any block by blockhash from the Ethereum Mainnet between blocks 1-2500. 
7.  **Crossing fingers** You should see the block header details before too long
### Development Notes

Use `npm run dev` in the `portalnetwork` library to have Typescript automatically recompile code as changes are made.  

The browser client supports live reload as well as so any changes made in the `portalnetwork` or `browser-client` libraries will result in the browser client reloading.
### Detailed Node Usage/Interop Instructions

See the [`browser client`](./packages/browser-client) and [`cli`](./packages/cli) READMEs for more specific usage with each client.

[Interop instructions](./INTEROP.md) for interacting with the [Fluffy](https://github.com/status-im/nimbus-eth1/tree/master/fluffy) and [Trin](https://github.com/ethereum/trin) portal clients
## Monorepo Structure

### [`portalnetwork`](./packages/portalnetwork)

The `portalnetwork` library is the application layer needed to interact with the Portal Network and depends on `discv5` for its networking layer

### [`Ultralight-Proxy`](./packages/proxy)

This a simple nodejs server that accepts incoming websocket connections from clients running the `portalnetwork` module and routes their messages on to other Portal Network clients
### [`Ultralight-Browser-Client`](./packages/browser-client)

This is a technical demonstration of a web application that uses the `portalnetwork` module to connect to the Portal Network

### [`Ultralight-CLI`](./packages/cli)

This is a technical demonstration of a NodeJS application that uses the `portalnetwork` module to connect to the Portal Network


