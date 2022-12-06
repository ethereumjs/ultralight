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
- From `./packages/cli`:
- Run `npm run devnet -- --numNodes=3`
  - This will start 3 nodes with JSON-RPC server addresses `[8545, 8546, 8547]`
- To specify a port number to, include a `--port` variable
  - `num run devnet -- --numNodes=5 --port=9009`
  - This will start 5 nodes with JSON-RPC server addresses `[9009, 9010, 9011, 9012, 9013]`

### Using the Devnet
#### From the command line:
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
  const peer0ENR = await peer0.request('discv5_nodeInfo', [])
  console.log(ultralightENR.result)
  console.log(peer0ENR.result)

  const addBlock = await ultralight.request('ultralight_addBlockToHistory', [
    testBlock.hash,
    testBlock.rlp,
  ])
  console.log(addBlock.result)


  const ping1 = await peer0.request('portal_historyPing', [
    ultralightENR.result.enr,
  ])
  console.log(ping1.result)

  const findCon = await peer0.request('eth_getBlockByHash', [testBlock.hash, true])
  console.log(findCon)


}

main()

```

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