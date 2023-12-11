# Subnetworks

Ultralight currently supports three subnetworks with various levels of completeness, History, Beacon, and State.  All of these networks can be experimented with using the Ultralight devnet scripts along with various companion scripts that will pipe in mainnet data as noted below.

## History Network

The History Network is enabled by default when Ultralight starts and is devoted to storing and making available Ethereum block headers, block bodies, and receipts.  To experiment with the History Network specifically, do the following:
- Start a local devnet - `npm run devnet -- --numNodes=5`
- Start the History bridge script - `npx tsx scripts/bridge.ts http://[json.rpc.provider.com]` and pass in a fully qualified http URL for a JSON-RPC provider (e.g. an Infura endpoint or a local full node exposing the eth namespace of the JSON-RPC)
- The bridge script will retrieve the latest block and inject it into the network via Ultralight RPC endpoints
- You can then retrieve these blocks from the local devnet by making a call to the `eth_getBlockByHash` RPC endpoint on any of the nodes

## Beacon Light Client Network
Ultralight has an embedded Lodestar light client capable of tracking the head of the Beacon Chain using light client data objects sourced from the portal network.  Ultralight supports bootstrapping the light client using one of two methods:
1) Pass in a trusted checkpoint root (i.e. a trusted blockroot obtained from your preferred checkpoint sync provider)
2) Use an experimental voting process whereby Ultralight queries peers on the Portal Network for recent Light Client Updates and then selects a bootstrap based on receiving a plurality of "votes" from peers (i.e. getting the same finalized header included in a Light Client Update from a majority of peers).  This is very experimental and prone to failure at this stage of development.  Also, note, selecting a Beacon Chain checkpoint using this method is not known to be trustworthy so should be treateed as purely a novelty for now.

To experiment with the Beacon Light Client Network, do the following:
- Start a local devnet - `npm run devnet -- --networks=beacon --numNodes=[5 or more ideally]`
- Pick your light client bootstrap method from above and follow one of the below bootstrapping methods as applicable:
  -- Trusted Checkpoint Sync - `npx tsx scripts/beaconBridge.ts`
  -- Bootstrap Peer Voting - `npx tsx scripts/bootstrapFinder.ts`
- Observe the logs.  If all goes well, you should see something like below eventually, which indicates that the embedded Lodestar light client has begun tracking the head of the chain and will continue to do so as long as new updates are piped in.

```sh
  13527:Portal:BeaconLightClientNetwork:LightClientTransport Found LightClientBootstrap locally.  Initializing light client... +0ms
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG Syncing +0ms
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG { lastPeriod: 945, currentPeriod: 947 } +1ms
  13527:Portal:BeaconLightClientNetwork:LightClientTransport requesting lightClientUpdatesByRange starting with period 945 and count 3 +15ms
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG Updated state.optimisticHeader +19ms
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG { slot: 7743724 } +0ms
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG processed sync update +0ms
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG { slot: 7743724 } +0ms
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG Updated state.optimisticHeader +21ms
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG { slot: 7749758 } +0ms
  ```
 ...
 ```sh
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG { slot: 7757824 } +0ms
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG processed sync update +0ms
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG { slot: 7757893 } +0ms
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG Synced +0ms
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG { currentPeriod: 947 } +0ms
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG Started tracking the head +1ms
  ultralight Received portal_beaconStore with params: 0: 0x03f67e760000000000,1: 0xbba4da96ac000000ffffffffffff7fffffffffffffffffffffffffffffffff... +14s
  13527:Portal:BeaconLightClientNetwork storing LightClientOptimisticUpdate content corresponding to 0x03f67e760000000000 +14s
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG Updated state.optimisticHeader +14s
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG { slot: 7765749 } +0ms
  ultralight Received portal_beaconStore with params: 0: 0x02a07e760000000000,1: 0xbba4da9670010000ad040000f5b30300000000000000000000000000000000... +429ms
  13527:Portal:BeaconLightClientNetwork storing LightClientFinalityUpdate content corresponding to 0x02a07e760000000000 +428ms
  13527:Portal:BeaconLightClientNetwork:LightClient:DEBUG Updated state.finalizedHeader +429ms
  ```

You can also call the RPC methods `beacon_getHead` and `beacon_getFinalized` to get the latest Light Client Headers for `latest` and `finalized` blocks known to the light client.

## State Network

Ultralight currently supports a very minimal implementation of the State Network.  Currently, with a bridge script running to pipe in data, you can retrieve state data for accounts and contract storage that have appeared in recent blocks.  To experiment, you will need an Alchemy API key for Ethereum Mainnet.  Then, do the following:

- Run `npm run devnet -- --networks=history state --numNodes=1` - this activates both the History and State networks since History is required in order to retrieve the appropriate state root to retrieve state data from.

- In a separate window, run `ALCHEMY_API_KEY=[your Alchemy API key here] npx tsx scripts/bridgeThread.ts --devnet --numNodes=1`
- Observe the logs. When you see below, you are ready to start querying state data.
```sh
ultralight Received ultralight_addBlockToHistory with params: 0: 0x0edbb89e9235e54b9244d9d43df15d9a675a992f9cf1de4cab208e25ef50e2...,1: 0xf909bcf9023ca0bf6da7bb157049b329870ff302c80b734144de791532b980... +18s
  ddb83:ultralight:RPC ultralight_addBlockToHistory request received +0ms
  ddb83:ultralight:RPC Block 0x0edbb89e9235e54b9244d9d43df15d9a675a992f9cf1de4cab208e25ef50e2a7 added to content DB +32ms
  ddb83:Portal:HistoryNetwork BlockHeader added for 0x0edbb89e9235e54b9244d9d43df15d9a675a992f9cf1de4cab208e25ef50e2a7 +0ms
  ultralight Received ultralight_indexBlock with params: 0: 0x11b64ac,1: 0x0edbb89e9235e54b9244d9d43df15d9a675a992f9cf1de4cab208e25ef50e2... +64ms
  ddb83:ultralight:RPC Indexed block 18572460 / 0x11b64ac to 0x0edbb89e9235e54b9244d9d43df15d9a675a992f9cf1de4cab208e25ef50e2a7  +32ms
  ultralight Received portal_stateStore with params: 0: 0x0188e6a0c2ddd26feeb64f039a2c41296fcb3f56402bb46a3a16f6407aff6d...,1: 0x24000000fffffdfffffffffefffffffffffffffffffffffffdfffffffffff7... +161ms
  ddb83:Portal:StateNetwork content added for: 0x88e6a0c2ddd26feeb64f039a2c41296fcb3f56402bb46a3a16f6407aff6d1547be241d25cba796f07ec93b3d336801e8642f17a63e87f8ca4d7260c03f2111f64451ad84dc09264c53cfed10aecffb5c0a1bc0ab +0ms
  ddb83:ultralight:RPC stored 0x0188e6a0c2ddd26feeb64f039a2c41296fcb3f56402bb46a3a16f6407aff6d1547be241d25cba796f07ec93b3d336801e8642f17a63e87f8ca4d7260c03f2111f64451ad84dc09264c53cfed10aecffb5c0a1bc0ab in state network db +163ms
  ddb83:Portal:StateNetwork:StateDB ContractStorageTrieProof input success +0ms
```

- Take note of the an indexed block number (e.g. the `Indexed block 18572460 / 0x11b64c`)
- Go to Etherscan or a block explorer of your choice, pull up this block, and look at any transaction.  Copy the `from` or `to` address.
- From a terminal window, call the `eth_getBalance` endpoint on the Ultralight node and pass in the address and then the hexadecimal representation of the block number (see example below using the `curlie` tool)
`curlie 127.0.0.1:8545 jsonrpc=2.0 id=1 method=eth_getBalance params:='["0xba6aff023Ed0eC051Ce08b2b7E4170c9433BFB8d","0x11b64a0"]'`

If all goes well, you should get a response like:
```sh
HTTP/1.1 200 OK
content-length: 56
content-type: application/json; charset=utf-8
Date: Wed, 15 Nov 2023 02:03:31 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{
    "jsonrpc": "2.0",
    "id": "1",
    "result": "0x1272fbf8b77990ae"
}
```

This result can be checked against the account balance associated with the queried address at that block height on Etherscan or any archive node of your choice.

Note, the `eth_call` endpoint is also available though unlikely to produce useful results as its implementation requires access to state data that may not have been piped into the network via the existing bridge script.