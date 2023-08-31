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

### Connecting to the Portal Network

There are two ways to specify bootnodes at start-up.  Either pass in a bootnode's base64 string encoded ENR in the `--bootnode` CLI parameter or else pass the `--bootnodeList` parameter with a path to a plaintext file containing a list of base64 string encoded ENRs, one ENR per line.  

The [`bootnodes.txt`](./bootnodes.txt) contains the public bootnodes designated for the Portal Network testnet that are intended to provide an initial connection point into the Portal Network (though they are not guaranteed to be running at any given time).  Use at your own risk!

## Local Devnet
Run a local network of CLI Ultralight clients.  Test JSON-RPC calls in a terminal, or run a test script from `packages/cli/scripts/` like `sampleTest.ts`
- From `./packages/cli`:
- Run `npm run devnet -- --numNodes=3`
  - This will start 3 nodes with JSON-RPC server addresses `[8545, 8546, 8547]`
- To specify a port number to, include a `--port` variable
  - `num run devnet -- --numNodes=5 --port=9009`
  - This will start 5 nodes with JSON-RPC server addresses `[9009, 9010, 9011, 9012, 9013]`

### Using the Devnet
#### command-line:
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
```ts
// scripts/sampleTest.ts
import jayson from 'jayson/promise/index.js'

const testBlock = 
  {
    hash: '0x8faf8b77fedb23eb4d591433ac3643be1764209efa52ac6386e10d1a127e4220',
    rlp: '0xf9028df90217a013ced9eaa49a522d4e7dcf80a739a57dbf08f4ce5efc4edbac86a66d8010f693a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479452bc44d5378309ee2abf1539bf71de1b7d7be3b5a0ac4ba3fe45d38b28e2af093024e112851a0f3c72bf1d02b306506e93cd39e26da068d722d467154a4570a7d759cd6b08792c4a1cb994261196b99735222b513bd9a00db8f50b32f1ec33d2546b4aa485defeae3a4e88d5f90fdcccadd6dff516e4b9b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605af25e8b8e583030d41832fefd88252088455ee029798d783010102844765746887676f312e342e32856c696e7578a0ee8523229bf562950f30ad5a85be3fabc3f19926ee479826d54d4f5f2728c245880a0fb916fd59aad0f870f86e822d85850ba43b740083015f90947c5080988c6d91d090c23d54740f856c69450b29874b04c0f2616400801ba09aaf0e60d53dfb7c34ed51991bd350b8e021185ccc070b4264e209d16df5dc08a03565399bd97800b6d0e9959cd0920702039642b85b37a799391181e0610d6ba9c0',
    number: 200001,
  }

const { Client } = jayson

const main = async () => {
  const ultralight = Client.http({ host: '127.0.0.1', port: 8545 })
  const peer0 = Client.http({ host: '127.0.0.1', port: 8546 })
  const ultralightENR = await ultralight.request('discv5_nodeInfo', [])
  console.log(ultralightENR.result)

  const ping1 = await peer0.request('portal_historyPing', [
    ultralightENR.result.enr,
  ])
  console.log(ping1.result)

  const addBlock = await ultralight.request('ultralight_addBlockToHistory', [
    testBlock.hash,
    testBlock.rlp,
  ])
  console.log(addBlock.result)

  const findCon = await peer0.request('eth_getBlockByHash', [testBlock.hash, true])
  console.log(findCon)


}

main()


```

### JSON-RPC

The Ultralight client exposes a minimal JSON-RPC interface that allows for some interaction with the node.  A list of methods exposed can be found below but is not guaranteed to be up to date.  Please refer to [the source](./src/rpc.ts) for all currently available methods.

- `web3_clientVersion` - Returns the current client version (ultralight 0.0.1)

**discv5** Discv5 Routing Table operations
- `discv5_nodeInfo` - Returns the NodeId and ENR
- `discv5_updateNodeInfo` - Update a node in the Routing Table
- `discv5_routingTableInfo` - Returns Routing Table K-Buckets
- `discv5_addEnr` - Adds an ENR to Discv5 Routing Table
- `discv5_getEnr` - Retrieves an ENR by NodeId
- `discv5_deleteEnr` - Deletes an ENR from Routing Table
- `discv5_lookupEnr` - Lookup node by NodeId

**portal_<subprotocol>** Portal Network subprotocol operations

- `portal_historyAddBootNode` - Adds a new ENR to HistoryNetwork routing table
- `portal_historyNodeInfo` - Returns NodeId and ENR of History Protocol supporting node
- `portal_historyRoutingTableInfo` - Returns History Network Routing Table K-Buckets
- `portal_historyLookupEnr` - Lookup node by NodeId
- `portal_historyAddEnrs` - Add ENRs to Routing Table
- `portal_historyPing` - Ping a node on History Protocol
- `portal_historyFindNodes` - Takes a `nodeId` and an array of `log2distances` and sends a `FINDNODES` request to that node
- `portal_historyLocalContent` - Search local database for content
- `portal_historyFindContent` - Ask a peer for content by content key
- `portal_historyOffer` - Offer a peer a list of content keys

**eth_** - Mimics the current Ethereum Full Node `eth` namespace methods.
- `eth_getBlockByNumber` 
- `eth_getBlockByHash` 
- `eth_getBlockTransactionCountByHash`
- `eth_getUncleCountByNumber`
- `eth_getLogs`

**ultralight_** - Methods to manually add content to database
- `ultralight_addBlockToHistory` - Add a block header and body to database
- `ultralight_addContentToDB` - Add any content to database
  
### Troubleshooting

#### macOS

On macOS Ventura 13.4 with Node.js 18.7.1 LTS installed with `nvm install 18.7.1 && nvm use 18.7.1`, which comes with NPM 9.6.7, then if you try to run `npm install` in the project root or in subpackages it may freeze when it gets up to displaying the following
```bash
...
npm info run esbuild@0.18.20 postinstall { code: 0, signal: null }
npm timing build:run:postinstall:node_modules/esbuild Completed in 695ms
(##################) ⠏ reify:typescript: timing build:run:postinstall:node_modules/esbuild Completed in 695ms
```

To overcome this it was necessary to remove the dependencies that were installed in project root
```
rm -rf node_modules/
```

Then instead of installing dependencies from the project root, it was necessary to instead install them first in packages/browser-client, and then in this packages/cli folder, because if you install dependencies in packages/cli folder first, then it might output the following error:
```bash
...
[webpack-cli] Failed to load '/Users/me/ultralight/packages/browser-client/webpack.config.js' config
[webpack-cli] Error: Cannot find module 'html-webpack-plugin'
```

Also, if you use the NPM version 9.6.7 that comes pre-installed with Node.js 18.7.1 LTS, or you switch to NPM 8.6.0 with `npm install -g npm@8.6.0` then that might cause it to freeze when you run `npm install` in packages/browser-client and show the following error:
```bash
npm info run esbuild@0.18.20 postinstall { code: 0, signal: null }
npm timing build:run:postinstall:node_modules/esbuild Completed in 695ms
(##################) ⠏ reify:typescript: timing build:run:postinstall:node_modules/esbuild Completed in 695ms
```

It seems this is an issue with the latest NPM versions, and based on feedback from sources like [this](https://stackoverflow.com/questions/66893199/hanging-stuck-reifyprettier-timing-reifynodenode-modules-nrwl-workspace-comp) the solution that worked was to downgrade NPM to version 7.24.2.

But unfortunately if you use NPM 7.24.2 and then run `npm install` in the project root, it may output errors like the following because the package-lock.json requires NPM `>=8.6.0` for some packages
```bash
npm WARN EBADENGINE Unsupported engine {
npm WARN EBADENGINE   package: '@multiformats/multiaddr@12.1.7',
npm WARN EBADENGINE   required: { node: '>=18.0.0', npm: '>=8.6.0' },
npm WARN EBADENGINE   current: { node: 'v18.17.1', npm: '7.24.2' }
...
```

So then it is necessary to first remove dependences from the project root with `rm -rf node_modules/` and then switch to packages/browser-client and downgrade to NPM 7.24.2 before installing the dependencies. The following was run and compiled successfully:
```bash
cd packages/browser-client
npm install -g npm@7.24.2
npm install
```

Another issue that you may encounter if you are on a fresh Macbook M2 or similar is that whilst you may have the `python3` binary in your PATH, you may not also have `python`, so when you run `npm install` it may give you error `env: python: No such file or directory`. In that case it is necessary to create a symlink as recommended here https://stackoverflow.com/a/75239468/3208553, by running the following. It is not sufficient to just create an alias.
```bash
ln -s /Library/Developer/CommandLineTools/usr/bin/python3 /usr/local/bin/python
npm install
```

After installing dependences in packages/browser-client, switch to packages/cli, and install dependencies there too, and then run the Ultralight CLI tests and they should all pass:
```bash
cd ../cli
npm install
npm run test
```

## Note
This requires Node version 16 or above