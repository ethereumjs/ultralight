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

Ultralight supports the State Network either through the low level `portal_state*` RPC calls or the Ethereum JSON-RPC endpoints `eth_getBalance` and `eth_call`.  You can make calls the way you would with any RPC as below.  Your mileage may vary.

```sh
curlie 127.0.0.1:8545 jsonrpc=2.0 id=1 method=eth_getBalance params:='["0x816E4a1589e363720c15c54dFD2eFd16f6377070","0x140cb3c"]'
```