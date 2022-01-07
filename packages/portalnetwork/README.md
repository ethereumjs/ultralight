# Portal Network Module 

Will one day be the interface library for the Portal Network

See [API](./docs/modules.md) for more details

## Routing Table Management

The Portal Network module currently supports two overlay routing tables for use with tbe below two subnetworks:
- State Network
- History Network

The Ultralight implementation of the Portal Network uses the following strategy to maintain a live and up to date routing table for each subnetwork

### Joining the network

When the client starts, Ultralight will try to connect to a bootnode (if provided) or the first node added via the `discv5.addEnr` method.  Once a discv5 session is established, the client sends a Portal Network `PING` request to the bootnode for each supported Portal Network subnetwork and adds the bootnode to the corresponding k-bucket in each subnetwork routing table.  

### Routing Table Maintenance

- To keep k-buckets fresh, every 30 seconds, the client selects a random bucket from the nearest 10 buckets that are not full (i.e. have 16 ENRs already), generates a random Node ID that would fall in that bucket, and then initiates a `discv5.findNode` request.  Whenever a discv5 session is established with a new node in the network, the client also sends a Portal Network PING message to that node and adds it to the corresponding Subnetwork routing table.
- Adding nodes to a subnetwork routing table occurs whenever a `NODES` response contains 1 or more ENRs [here](https://github.com/ethereumjs/ultralight/blob/1b374767997d2feb5addd478d09fd94d6750da3b/packages/portalnetwork/src/client/client.ts#L192) not currently held in the routing table or whenever a [discv5 session is established](https://github.com/ethereumjs/ultralight/blob/886ebf0ba03990a24ab1ef504b4521bf38d55352/packages/portalnetwork/src/client/client.ts#L106).
- Nodes are removed from a specified subnetwork routing table whenever a Portal Network Message doesn't return a response (except for uTP messages) as [here](https://github.com/ethereumjs/ultralight/blob/1b374767997d2feb5addd478d09fd94d6750da3b/packages/portalnetwork/src/client/client.ts#L540)
- Nodes are also removed whenever a discv5 [session ends](https://github.com/ethereumjs/ultralight/blob/1b374767997d2feb5addd478d09fd94d6750da3b/packages/portalnetwork/src/client/client.ts#L71)) since Portal Network messages are dependent on an active discv5 session
- Liveness checks are done every 5 minutes by the discv5 network and Portal Network subnetwork routing table liveness and nodes are removed from the subnetwork routing tables whenever a liveness check fails

## Content Management

### History Network

Content for the history network is stored in the DB as key/value pairs consisting of the below:
- `key` -- hex string encoded representation of the History Network `content-id` (e.g. `0xfac2ca64257e97b691a0ff405c4f8d62ab52a6e0f0d2f92e25022ca12a56a881` is the `content-id` for the header for Block 1 on mainnet)
- `value` -- hex string encoded representation of the RLP serialized content (block header, block body, receipt)
# Acknowledgements

[Chainsafe's `discv5` implementation](https://github.com/ChainSafe/discv5) without which none of this would be possible