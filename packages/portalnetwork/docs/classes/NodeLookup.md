[portalnetwork](../README.md) / [Exports](../modules.md) / NodeLookup

# Class: NodeLookup

## Table of contents

### Constructors

- [constructor](NodeLookup.md#constructor)

### Properties

- [client](NodeLookup.md#client)
- [log](NodeLookup.md#log)
- [networkId](NodeLookup.md#networkid)
- [nodeSought](NodeLookup.md#nodesought)

### Methods

- [startLookup](NodeLookup.md#startlookup)

## Constructors

### constructor

• **new NodeLookup**(`portal`, `nodeId`, `networkId`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `portal` | [`PortalNetwork`](PortalNetwork.md) |
| `nodeId` | `string` |
| `networkId` | [`SubNetworkIds`](../enums/SubNetworkIds.md) |

#### Defined in

[packages/portalnetwork/src/wire/nodeLookup.ts:17](https://github.com/ethereumjs/ultralight/blob/51c7177/packages/portalnetwork/src/wire/nodeLookup.ts#L17)

## Properties

### client

• `Private` **client**: [`PortalNetwork`](PortalNetwork.md)

#### Defined in

[packages/portalnetwork/src/wire/nodeLookup.ts:12](https://github.com/ethereumjs/ultralight/blob/51c7177/packages/portalnetwork/src/wire/nodeLookup.ts#L12)

___

### log

• `Private` **log**: `Debugger`

#### Defined in

[packages/portalnetwork/src/wire/nodeLookup.ts:15](https://github.com/ethereumjs/ultralight/blob/51c7177/packages/portalnetwork/src/wire/nodeLookup.ts#L15)

___

### networkId

• `Private` **networkId**: [`SubNetworkIds`](../enums/SubNetworkIds.md)

#### Defined in

[packages/portalnetwork/src/wire/nodeLookup.ts:14](https://github.com/ethereumjs/ultralight/blob/51c7177/packages/portalnetwork/src/wire/nodeLookup.ts#L14)

___

### nodeSought

• `Private` **nodeSought**: `string`

#### Defined in

[packages/portalnetwork/src/wire/nodeLookup.ts:13](https://github.com/ethereumjs/ultralight/blob/51c7177/packages/portalnetwork/src/wire/nodeLookup.ts#L13)

## Methods

### startLookup

▸ **startLookup**(): `Promise`<`void`\>

Queries the `a` nearest nodes in a subnetwork's routing table for nodes in the kbucket and recursively
requests peers closer to the `nodeSought` until either the node is found or there are no more peers to query

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/wire/nodeLookup.ts:30](https://github.com/ethereumjs/ultralight/blob/51c7177/packages/portalnetwork/src/wire/nodeLookup.ts#L30)
