# Ultralight Block Explorer

This is a proof of concept block explorer that can start an Ultralight portal network client in the browser that leverages a UDP proxy service (or an Android mobile app) to connect to other nodes in the network and retrieve blocks from the History Network.

## Usage

### Local Development/Testing

- Run `node packages/proxy/dist/index.js --nat=localhost` from the monorepo root to run the UDP proxy.
- Run `npm run start-browser-client`
- Open a browser window and navigate to localhost:8080 and start the node.

The `portal` object is exposed in the browser console and can be used to experiment with portal network functionality. See [the portal network docs](../portalnetwork/docs/modules.md) for API specs

### To run with local devnet

More details on the local devnet can be found [here](../../DEVNET.md)

From the repo root:
- Run `npm run start-browser-client`
- Run `bash packages/cli/scripts/devnet.sh -n [number of nodes you want to start]`
- Run `npx ts-node packages/cli/scripts/seeder.ts --rpcPort=8546 --numBlocks=2 --sourceFile="/path/to/blocksData.json" --numNodes=[number of nodes you started]`

Grab an ENR from the logs (or else query the devnet bootnode via JSON RPC at localhost:8546)

```
xxxx:discv5:service Updated ENR based on public multiaddr to enr:-IS4QDYYxq9-JKPr07yvC2KiMZ0pUuplYthRhr42CmMP5LEkBn8pZJap0YnTQ8Es0DmxPh4ph7zVFNaBG-8ZzCjcQ4cFgmlkgnY0gmlwhH8AAAGJc2VjcDI1NmsxoQPV0HLibJut96kp54laQSGvfkvRp8pl4wXuP4crtg2pQoN1ZHCChsQ
```
Copy the ENR (starts with `enr:-IS`) from Terminal

Paste the ENR into the `Node ID` input and press `Connect to Node`

Copy any blockhash from those loaded via the seeder script and paste into the search field in the Block Explorer. Hit `Find Block By Hash`

Block info will be requested from the network, and displayed upon retrieval. Clicking the search button next to a Parent Hash will perform a search for that block. 

### Mobile Development [**experimental**]

See [Mobile Development setup steps](./docs/mobile.md) for more details.