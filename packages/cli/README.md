# Ultralight CLI

This is an experimental tool for running an ultralight node from the command line in a NodeJS environment.  All functionality for the portal module behaves in the same manner as the [browser client](../browser-client).

## Usage

### Quickstart
- Clone the ultralight monorepo and run `npm i` from the monorepo root.
- Change to `./packages/cli`
- Run `ts-node src/index.ts --bootnode=enr:[Your favorite bootnode ENR here] --proxy --nat=extip`
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


## Note
This requires Node version 16 or above