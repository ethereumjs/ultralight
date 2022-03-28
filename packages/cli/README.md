# Ultralight CLI

This is an experimental tool for running an ultralight node from the command line in a NodeJS environment.  All functionality for the portal module behaves in the same manner as the [browser client](../browser-client).

## Usage

### Quickstart
- Clone the ultralight monorepo and run `npm i` from the monorepo root.
- Change to `./packages/cli`
- Run `node dist/index.js --proxy --nat=extip --bootnode=enr:[Your favorite bootnode ENR here (if desired)] `
- The node will start a local instance of the network proxy, determine its public IP address, and then connect to the bootnode specified

### CLI Parameters
 - `--pk`              base64 string encoded protobuf serialized private key 
 - `--bootnode`        base64 string encoded ENR of Bootnode  (e.g. `enr:-IS...`)
 - `--bootnodeList`    path to a file containing a list of bootnode ENRs (note: one ENR per line)
 - `--proxy`           Start proxy service  [default: true]          
 - `--nat`             NAT Traversal options for proxy [choices: "localhost", "lan", "extip"] 
-  `--persistentPort`  run the proxy on a persistent UDP port             
-  `--rpc`             Enable the JSON-RPC server with HTTP endpoint [default: true]
-  `--rpcPort`         HTTP-RPC server listening port             
-  `--rpcAddr`         HTTP-RPC server listening interface address [default: "localhost"]
-  `--metrics`         Turn on Prometheus metrics reporting [default: false]
-  `--metricsPort`     Port exposed for metrics scraping  [default: 18545]
-  `--dataDir`         data directory where content is stored        
### Starting with the same Node ID 

To start a node that has the same node ID each time, you can pass the `--pk` parameter at start-up with a base64 string encoded protobuf serialized private key.  So `ts-node src/index.ts --pk=CAISINx/bjWlmCXTClX2JvDYehb8FSrE6l4MA9LGvP74XdfD` will always start the `cli` client with the node ID `2a9511ca767b7b56bb873234209557d07c5fe09382ed060b272c6a933c5658f5`.

You can use the `generateKeys` script to generate any number of private keys using the command `ts-node scripts/generateKeys --numKeys=X` where X is the number of keys to generate.

### Connecting to the Portal network

There are two ways to specify bootnodes at start-up.  Either pass in a bootnode's base64 string encoded ENR in the `--bootnode` CLI parameter or else pass the `--bootnodeList` parameter with a path to a plaintext file containing a list of base64 string encoded ENRs, one ENR per line.  

The [`bootnodes.txt`](./bootnodes.txt) contains the 3 Ultralight public bootnodes that are intended to provide an initial connection point into the Portal Network (though they are not guaranteed to be running at any given time).  Use at your own risk!

### JSON-RPC

The Ultralight client exposes a minimal JSON-RPC interface that allows for some interaction with the node.  A list of methods exposed can be found below but is not guaranteed to be up to date.  Please refer to [the source](./src/rpc.ts) for all currently available methods.

- `discv5_nodeInfo` - Returns the current client version
- `eth_getBlockByHash` - Mimics the current Ethereum Full Node `eth_getBlockByHash` interface.  All data is retrieved from the local node database or else other Portal Network clients (if connected)
- `portal_addBootNode` - Adds a new bootnode provided by the passed in ENR
- `portal_addBlockToHistory` - Takes a hex string encoded Ethereum block by RLP and adds it to the local node database for later serving via the Portal Network
- `portal_nodeEnr` - returns the base64 encoded string of the local node ENR
- `portal_findNodes` - takes a nodeId and an array of log2distances and sends a `FINDNODES` request to that node
- `portal_offer` - takes a nodeId, a block hash, and a content type, derives the corresponding contentKey, and then offers that content to the specified nodeId
- `portal_ping` - takes a nodeId and then sends a `PING` message to the specified nodeId
## Note
This requires Node version 16 or above