# Ultralight CLI

This is an NodeJS implementation of an Ultralight node that exposes a JSON-RPC for interacting with the Portal Network.  

## Usage

The easiest way to get started with Ultralight is to use the `npm run dev` script to start up a a single local node:

`npm run dev` along with any of the below parameters.  Pass `--help` as a CLI parameter for a complete list of available options.

### CLI Parameters
  --pk                base64 string encoded protobuf serialized private key  [string]
  --bootnode          ENR of Bootnode                                        [string]
  --bindAddress       initial IP address and UDP port to bind to             [string]
  --bootnodeList      path to a file containing a list of bootnode ENRs      [string]
  --rpc               Enable the JSON-RPC server with HTTP endpoint          [boolean] [default: true]
  --rpcPort           HTTP-RPC server listening port                         [number] [default: 8545]
  --rpcAddr           HTTP-RPC server listening interface address            [string]
  --metrics           Turn on Prometheus metrics reporting                   [boolean] [default: false]
  --metricsPort       Port exposed for metrics scraping                      [number] [default: 18545]
  --dataDir           data directory where content is stored                 [string]
  --web3              web3 JSON RPC HTTP endpoint for local Ethereum node    [string]
  --networks          subnetworks to enable  (options are: `history`, `state`, `beacon`) [default: `history`]
  --trustedBlockRoot  a trusted blockroot to start light client syncing of the beacon chain [string]

### Starting with the same Node ID 

To start a node that has the same node ID each time, you can pass the `--pk` parameter at start-up with a base64 string encoded protobuf serialized private key.  So `ts-node-esm src/index.ts --pk=CAISINx/bjWlmCXTClX2JvDYehb8FSrE6l4MA9LGvP74XdfD` will always start the `cli` client with the node ID `2a9511ca767b7b56bb873234209557d07c5fe09382ed060b272c6a933c5658f5`.

### Connecting to the public testnet

The implementation teams run a few public bootnodes for interacting with other Portal Network nodes in the wild.  These nodes currently just support the History network but hopefully more capabilities are coming soon!

There are two ways to specify bootnodes at start-up.  Either pass in a bootnode's base64 string encoded ENR in the `--bootnode` CLI parameter or else pass the `--bootnodeList` parameter with a path to a plaintext file containing a list of base64 string encoded ENRs, one ENR per line.  

The [`bootnodes.txt`](./bootnodes.txt) contains the ENRs for the public bootnodes designated and are intended to provide an initial connection point to the fleets of Portal Network nodes operated by implementation teams.  Use at your own risk!

## Local Devnet
Run a local network of CLI Ultralight clients.  Test JSON-RPC calls in a terminal, or run a test script from `packages/cli/scripts/` like `sampleTest.ts`
- From `./packages/cli`:
- Run `npm run devnet -- --numNodes=3`
  - This will start 3 nodes with JSON-RPC server addresses `[8545, 8546, 8547]`
- To specify a discv5 port number, include a `--port` variable
  - `npm run devnet -- --numNodes=5 --port=9009`
  - This will start 5 nodes with discv5 listener ports on `[9009, 9010, 9011, 9012, 9013]`
- To specify which subnetworks to support, include one or more options with the `--networks` parameter as shown below
  - `npm run devnet -- --numNodes=5 --networks=history beacon`

Note, all nodes are connected to each other as bootnodes for each network by default.  To turn off this behavior, pass `--connectNodes=false`.

### Using the Devnet
#### From the command-line:
  *Make JSON-RPC calls using `curl` or `httpie`*
- Get a node's ENR and NodeId
  - `http POST 127.0.0.1:8545 jsonrpc=2.0 id=1 method=discv5_nodeInfo params:=[]`
    - __copy the `<enr>` value
```json
    {
    "id": "1",
    "jsonrpc": "2.0",
    "result": {
        "enr": "enr:-IS4QIDbdz4hUnMDy09zUlXR5k...",
        "nodeId": "0x7d878d995cab4c75608084376a93..."
        }
    }
```
  - Ping the first node from another
    - `http POST 127.0.0.1:8456 jsonrpc=2.0 id=1 method=portal_historyPing params:='["<enr>"]'`
```json
{
    "id": "1",
    "jsonrpc": "2.0",
    "result": "PING/PONG successful with 0x7d878d995cab4c75608084376a93..."
}
```
- Add a block (header, body, receipt) to a node's database:
    - `http POST 127.0.0.1:8545 jsonrpc=2.0 id=1 method=ultralight_addBlockToHistory params:='["<blockHash>", "<blockRlp>"]'`
```json
{
    "id": "1",
    "jsonrpc": "2.0",
    "result": "Block <blockHash> added to content DB"
}
```
- Retrieve block content with another
  - `http POST 127.0.0.1:8546 jsonrpc=2.0 id=1 method=eth_getBlockByHash params:='["<blockHash>", true]'`
```
{
  id: '1',
  jsonrpc: '2.0',
  result: {
    header: {
      parentHash: '0xd32c9544473fc38...',
      uncleHash: '0x1dcc4de8dec75d7a...',
      coinbase: '0x52bc44d5378309ee2...',
      stateRoot: '0xbf208abc4d2964e5...',
      transactionsTrie: '0x25ac8c77b...',
      receiptTrie: '0x435cec14c37f75...',
      logsBloom: '0x0000000...',
      difficulty: '0x5aae...',
      number: '0x30...',
      gasLimit: '0x2f...',
      gasUsed: '0xf1...',
      timestamp: '0x55e...',
      extraData: '0xd783010102844765...',
      mixHash: '0xa14a2a095183a08b07...',
      nonce: '0x066ae63e55...'
    },
    transactions: [ [Object], [Object], [Object] ],
    uncleHeaders: []
  }
}
```

#### Using Typescript
*scripts/sampleTest.ts` performs the same sequence of JSON-RPC calls as above*
- From `./packages/cli`
   - `npm run devnet --numNodes=2`
     - `starting 2 nodes...`
     - `Started JSON RPC Server address=http://localhost:8545`
     - `Started JSON RPC Server address=http://localhost:8546`
- From `./packages/cli` *( in another terminal )*
   - `npx ts-node --esm scripts/sampleTest.ts`

### RPC
See the [RPC docs](./RPC.md) for details on the available RPC endpoints.
  
### Supported Portal Network Subnetworks

See the [Networks](./networks.md) for details on how to interact with specific subnetworks.

### Troubleshooting

#### Freezes during installation of dependencies

If it freezes during installation of dependencies when you run `npm install` from the monorepo root then run `npm run clean` from the monorepo root and try running `npm install` again.

#### Error `env: python: No such file or directory` on macOS

If you are on fresh Macbook or similar then whilst you may have the `python3` binary in your PATH, you may not also have `python` in your PATH, so when you run `npm install` from the monorepo root it may give you error `env: python: No such file or directory`. In that case it is necessary to create a symlink by running the following:
```bash
ln -s /Library/Developer/CommandLineTools/usr/bin/python3 /usr/local/bin/python
```

### Testing

Run the following from the monorepo root
```bash
npm install
npx vitest run
```
> If you encounter an error then first run `npm run clean`

### Contributing

Run the following from monorepo root to show linting errors and fix them to pass CI tests:
```bash
npm run lint
```

## Note
This requires Node version 18 or above