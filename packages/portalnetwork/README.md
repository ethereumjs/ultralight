# Portal Network Module 

Will one day be the interface library for the Portal Network

See [API](./docs/modules.md) for more details

## Routing Table Management

The Portal Network module currently supports two overlay routing tables for use with tbe below two subnetworks:
- State Network
- History Network

The Ultralight implementation of the Portal Network uses the following strategy to maintain a live and up to date routing table for each subnetwork

### Joining the network

When the client starts, Ultralight will try to connect to a bootnode (if provided) or the first node added via the `discv5.addEnr` method.  Once a discv5 session is established, the client sends a Portal Network `FINDNODES` request to the bootnode with a request for all buckets in the specified subnetwork routing table that are empty.  Upon receiving a `NODES` response with 1 or more ENRs, the client then establishes a discv5 session with each node who's ENR was included in the response  and sends a `FINDNODES` request with all remaining empty buckets in the specified subnetwork routing table.  This process continues each time a connection is established with a new node as long as there are empty buckets in the subnetwork routing table.

### Routing Table Maintenance

- Adding nodes to a subnetwork routing table occurs whenever a `NODES` response contains 1 or more ENRs [here](https://github.com/ethereumjs/ultralight/blob/1b374767997d2feb5addd478d09fd94d6750da3b/packages/portalnetwork/src/client/client.ts#L192) not currently held in the routing table
- Nodes are removed from a specified subnetwork routing table whenever a Portal Network Message doesn't return a response (except for uTP messages) as [here](https://github.com/ethereumjs/ultralight/blob/1b374767997d2feb5addd478d09fd94d6750da3b/packages/portalnetwork/src/client/client.ts#L540)
- Nodes are also removed whenever a discv5 [session ends](https://github.com/ethereumjs/ultralight/blob/1b374767997d2feb5addd478d09fd94d6750da3b/packages/portalnetwork/src/client/client.ts#L71)) since Portal Network messages are dependent on an active discv5 session
- Liveness checks are done every 5 minutes by the discv5 network and Portal Network subnetwork routing table liveness and nodes are removed from the subnetwork routing tables whenever a liveness check fails

## Content Management

### History Network

Content for the history network is stored in the DB as key/value pairs consisting of the below:
- `key` -- hex string encoded representation of the serialized History Network `content-key` (e.g. `0x00010088e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6` is the content Key for the header for Block 1 on mainnet)
- `value` -- hex string encoded representation of the RLP serialized content (block header, block body, receipt)
# Acknowledgements

[Chainsafe's `discv5` implementation](https://github.com/ChainSafe/discv5) without which none of this would be possible