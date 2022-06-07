[portalnetwork](../README.md) / [Exports](../modules.md) / IDiscv5CreateOptions

# Interface: IDiscv5CreateOptions

Discovery v5 is a protocol designed for encrypted peer discovery and topic advertisement. Each peer/node
on the network is identified via its ENR (Ethereum Name Record) which is essentially a signed key-value
store containing the node's public key and optionally IP address and port.

Discv5 employs a kademlia-like routing table to store and manage discovered peers and topics.
The protocol allows for external IP discovery in NAT environments through regular PING/PONGs with
discovered nodes.
Nodes return the external IP address that they have received and a simple majority is chosen as our external
IP address.

This section contains protocol-level logic. In particular it manages the routing table of known ENRs, topic
registration/advertisement and performs lookups

## Table of contents

### Properties

- [config](IDiscv5CreateOptions.md#config)
- [enr](IDiscv5CreateOptions.md#enr)
- [metrics](IDiscv5CreateOptions.md#metrics)
- [multiaddr](IDiscv5CreateOptions.md#multiaddr)
- [peerId](IDiscv5CreateOptions.md#peerid)
- [transport](IDiscv5CreateOptions.md#transport)

## Properties

### config

• `Optional` **config**: `Partial`<`IDiscv5Config`\>

#### Defined in

node_modules/@chainsafe/discv5/lib/service/service.d.ts:30

___

### enr

• **enr**: `ENRInput`

#### Defined in

node_modules/@chainsafe/discv5/lib/service/service.d.ts:27

___

### metrics

• `Optional` **metrics**: `IDiscv5Metrics`

#### Defined in

node_modules/@chainsafe/discv5/lib/service/service.d.ts:31

___

### multiaddr

• **multiaddr**: `Multiaddr`

#### Defined in

node_modules/@chainsafe/discv5/lib/service/service.d.ts:29

___

### peerId

• **peerId**: `PeerId`

#### Defined in

node_modules/@chainsafe/discv5/lib/service/service.d.ts:28

___

### transport

• `Optional` **transport**: `ITransportService`

#### Defined in

node_modules/@chainsafe/discv5/lib/service/service.d.ts:32
