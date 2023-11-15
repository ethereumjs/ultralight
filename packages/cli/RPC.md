# Ultralight's JSON-RPC implementation

The Ultralight client exposes a JSON-RPC interface that allows for low-level interaction with the node.  A list of methods exposed can be found below but is not guaranteed to be up to date.  Please refer to [the source](./src/rpc.ts) for all currently available methods.

## Official Portal Network RPC methods
The below RPC methods from the [Portal Network RPC specification](https://playground.open-rpc.org/?schemaUrl=https://raw.githubusercontent.com/ethereum/portal-network-specs/assembled-spec/jsonrpc/openrpc.json&uiSchema%5BappBar%5D%5Bui:splitView%5D=false&uiSchema%5BappBar%5D%5Bui:input%5D=false&uiSchema%5BappBar%5D%5Bui:examplesDropdown%5D=false) are supported: 

**discv5** Discv5 Routing Table operations
- `discv5_nodeInfo` - Returns the NodeId and ENR
- `discv5_updateNodeInfo` - Update a node in the Routing Table
- `discv5_routingTableInfo` - Returns Routing Table K-Buckets
- `discv5_addEnr` - Adds an ENR to Discv5 Routing Table
- `discv5_getEnr` - Retrieves an ENR by NodeId
- `discv5_deleteEnr` - Deletes an ENR from Routing Table
- `discv5_lookupEnr` - Lookup node by NodeId

**portal_<subnetwork>** Portal Network subnetwork operations. 
-  `portal_statePing`
-  `portal_stateRoutingTableInfo`
-  `portal_stateStore`
-  `portal_stateLocalContent`
-  `portal_stateGossip`
-  `portal_stateFindContent`
-  `portal_stateRecursiveFindContent`
-  `portal_stateOffer`
-  `portal_stateSendOffer`
-  `portal_historyRoutingTableInfo`
-  `portal_historyAddEnr`
-  `portal_historyGetEnr`
-  `portal_historyDeleteEnr`
-  `portal_historyLookupEnr`
-  `portal_historySendPing`
-  `portal_historySendPong`
-  `portal_historySendFindNodes`
-  `portal_historySendNodes`
-  `portal_historySendFindContent`
-  `portal_historySendContent`
-  `portal_historySendOffer`
-  `portal_historySendAccept`
-  `portal_historyPing`
-  `portal_historyFindNodes`
-  `portal_historyFindContent`
-  `portal_historyOffer`
-  `portal_historyRecursiveFindNodes`
-  `portal_historyRecursiveFindContent`
-  `portal_historyStore`
-  `portal_historyLocalContent`
-  `portal_historyGossip`
-  `portal_beaconSendFindContent`  - not currently in the spec but follows other network variants of this method
-  `portal_beaconStore`  - not currently in the spec but follows other network variants of this method
-  `portal_beaconLocalContent`  - not currently in the spec but follows other network variants of this method

## Non-standard RPC methods

In addition, we also have several other non-standard RPC methods for the `history` and `beacon` networks 
-  `portal_beaconAddBootNode`
-  `portal_beaconStartLightClient` - starts the Beacon Chain light client if not already started
-  `portal_historyAddBootNode` - Adds a new ENR to HistoryNetwork routing table
-  `portal_historyNodeInfo` - Returns NodeId and ENR of History Network supporting node
-  `portal_historyRoutingTableInfo` - Returns History Network Routing Table K-Buckets
-  `portal_historyLookupEnr` - Lookup node by NodeId
-  `portal_historyAddEnrs` - Add ENRs to Routing Table
-  `portal_historyFindNodes` - Takes a `nodeId` and an array of `log2distances` and sends a `FINDNODES` request to that node
-  `portal_historyLocalContent` - Search local database for content
-  `portal_historyFindContent` - Ask a peer for content by content key

## Ethereum JSON-RPC endpoints
These endpoints emulate a subset of the the [Ethereum JSON-RPC](https://ethereum.github.io/execution-apis/api-documentation/) endpoints named, though data is sourced from Portal Network backends.

- `eth_getBlockByNumber` 
- `eth_getBlockByHash` 
- `eth_getBlockTransactionCountByHash`
- `eth_getUncleCountByNumber`
- `eth_getLogs`
- `eth_getBalance`
- `eth_call`

Note: expect gaps in functionality in above methods

## Ultralight Helper Endpoints
- `ultralight_addBlockToHistory` - Add an RLP serialized block header and body to database
- `ultralight_addContentToDB` - Add any content to database
- `ultralight_indexBlock` - Adds a block number to block hash mapping