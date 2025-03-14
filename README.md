# Ultralight - A Portal Network implementation in Typescript

This monorepo comprises an implementation of the [Portal Network spec](https://github.com/ethereum/portal-network-specs) and is **under active development**.  It aspires to allow dapps, wallet providers, and any Javascript based Ethereum application to leverage the Portal Network for access to the Ethereum chain history and state. 

## Prerequisites

Node v20+, NPM v10+

## Quick Start

Clone this repo and run `npm i` from the root directory.  This project leverages [`npm workspaces`](https://docs.npmjs.com/cli/v7/using-npm/workspaces) so requires NPM v7 or above.

- From the `packages/cli` subfolder, start the Ultralight `nodejs` client - `DEBUG=* npm run dev` and you should see some logs like below indicating the node is starting up:
```sh
de2f8:ultralight Started JSON RPC Server address=http://localhost:8545
```

This will start a single instance of the Ultralight client running locally.  

### Error related to `node-gyp` or `bcrypto.node`

If you encounter errors related to `bcrypto.node` or `node-gyp` when running `npm i`, you need to add `npm i -g @mapbox/node-pre-gyp` prior to running building Ultralight.

For Mac users, you may need to run `sudo xcodebuild -license` and accept it, as `node-gyp` relies on Xcode commands.


## Connecting to the devnet (developer testnet)

1. Change active folder: `cd packages/cli`
2. Run: `npm run devnet`
3. Client starts with the current list of bootnodes which will attempt to ping all of bootnodes in the provided default bootnode list (specified in `packages/cli/bootnodes.txt`)

### Additional Documentation

See the [`cli`](./packages/cli/README.md) documentation for more specific usage of the NodeJS Ultralight client.

See the [interop instructions](./INTEROP.md) for running Ultralight in conjunction with the [Fluffy](https://github.com/status-im/nimbus-eth1/tree/master/fluffy) and [Trin](https://github.com/ethereum/trin) portal clients.

### Development Notes

Use `npm run dev` in the `portalnetwork` library to have Typescript automatically recompile code as changes are made.  


## Monorepo Structure

### [`portalnetwork`](./packages/portalnetwork)

The `portalnetwork` library is the application layer needed to interact with the Portal Network and depends on `discv5` for its networking layer


### [`NodeJS Client`](./packages/cli)

This is a technical demonstration of a NodeJS application that uses the `portalnetwork` module to connect to the Portal Network


