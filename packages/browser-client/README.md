# Ultralight Block Explorer

This is a proof of concept that will start an Ultralight portal network client in the browser that leverages a UDP proxy service to connect to other nodes in the network,

## Usage

Run `npm run start` from the monorepo root to run the UDP proxy.

`npm run start` to start the browser client.

The `portal` object is exposed in the browser console and can be used to experiment with portal network functionality. See [the portal network docs](../portalnetwork/docs/modules.md) for API specs

## To test with DEVNET

From packages/cli run `bash scripts/devnet.sh -n 1`

You will see a log like this

```
xxxx:discv5:service Updated ENR based on public multiaddr to enr:-IS4QDYYxq9-JKPr07yvC2KiMZ0pUuplYthRhr42CmMP5LEkBn8pZJap0YnTQ8Es0DmxPh4ph7zVFNaBG-8ZzCjcQ4cFgmlkgnY0gmlwhH8AAAGJc2VjcDI1NmsxoQPV0HLibJut96kp54laQSGvfkvRp8pl4wXuP4crtg2pQoN1ZHCChsQ
```

Copy the ENR (starts with `enr:-IS`) from Terminal

From root run `npm run start-browser-client`

Start the Browser Node

Paste the ENR into the search field and press `CONNECT TO NODE`

From packages/cli run `npx ts-node scripts/seeder.ts --rpcPort=8546 --numBlocks=10 --sourceFile="./blocks200000-210000.json" --numNodes=1` to load 10 Blocks into this node's db.

Copy one of the blockhashes and paste into the search field in the Block Explorer. Hit `FIND BLOCK BY HASH`

Block info will be requested from the network, and displayed upon retrieval. Clicking the search button next to a Parent Hash will perform a search for that block. (_currently you must press `FIND BLOCK BY HASH` again for the search to work_)
