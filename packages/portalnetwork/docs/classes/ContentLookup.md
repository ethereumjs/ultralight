[portalnetwork](../README.md) / [Exports](../modules.md) / ContentLookup

# Class: ContentLookup

## Table of contents

### Constructors

- [constructor](ContentLookup.md#constructor)

### Properties

- [client](ContentLookup.md#client)
- [contacted](ContentLookup.md#contacted)
- [contentId](ContentLookup.md#contentid)
- [contentKey](ContentLookup.md#contentkey)
- [log](ContentLookup.md#log)
- [lookupPeers](ContentLookup.md#lookuppeers)
- [networkId](ContentLookup.md#networkid)

### Methods

- [startLookup](ContentLookup.md#startlookup)

## Constructors

### constructor

• **new ContentLookup**(`portal`, `contentKey`, `networkId`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `portal` | [`PortalNetwork`](PortalNetwork.md) |
| `contentKey` | `Uint8Array` |
| `networkId` | [`SubNetworkIds`](../enums/SubNetworkIds.md) |

#### Defined in

[packages/portalnetwork/src/wire/contentLookup.ts:22](https://github.com/ethereumjs/ultralight/blob/51c7177/packages/portalnetwork/src/wire/contentLookup.ts#L22)

## Properties

### client

• `Private` **client**: [`PortalNetwork`](PortalNetwork.md)

#### Defined in

[packages/portalnetwork/src/wire/contentLookup.ts:14](https://github.com/ethereumjs/ultralight/blob/51c7177/packages/portalnetwork/src/wire/contentLookup.ts#L14)

___

### contacted

• `Private` **contacted**: `lookupPeer`[]

#### Defined in

[packages/portalnetwork/src/wire/contentLookup.ts:16](https://github.com/ethereumjs/ultralight/blob/51c7177/packages/portalnetwork/src/wire/contentLookup.ts#L16)

___

### contentId

• `Private` **contentId**: `string`

#### Defined in

[packages/portalnetwork/src/wire/contentLookup.ts:17](https://github.com/ethereumjs/ultralight/blob/51c7177/packages/portalnetwork/src/wire/contentLookup.ts#L17)

___

### contentKey

• `Private` **contentKey**: `Uint8Array`

#### Defined in

[packages/portalnetwork/src/wire/contentLookup.ts:18](https://github.com/ethereumjs/ultralight/blob/51c7177/packages/portalnetwork/src/wire/contentLookup.ts#L18)

___

### log

• `Private` **log**: `Debugger`

#### Defined in

[packages/portalnetwork/src/wire/contentLookup.ts:20](https://github.com/ethereumjs/ultralight/blob/51c7177/packages/portalnetwork/src/wire/contentLookup.ts#L20)

___

### lookupPeers

• `Private` **lookupPeers**: `lookupPeer`[]

#### Defined in

[packages/portalnetwork/src/wire/contentLookup.ts:15](https://github.com/ethereumjs/ultralight/blob/51c7177/packages/portalnetwork/src/wire/contentLookup.ts#L15)

___

### networkId

• `Private` **networkId**: [`SubNetworkIds`](../enums/SubNetworkIds.md)

#### Defined in

[packages/portalnetwork/src/wire/contentLookup.ts:19](https://github.com/ethereumjs/ultralight/blob/51c7177/packages/portalnetwork/src/wire/contentLookup.ts#L19)

## Methods

### startLookup

▸ **startLookup**(): `Promise`<`any`\>

Queries the 5 nearest nodes in the history network routing table and recursively
requests peers closer to the content until either the content is found or there are no more peers to query

#### Returns

`Promise`<`any`\>

#### Defined in

[packages/portalnetwork/src/wire/contentLookup.ts:36](https://github.com/ethereumjs/ultralight/blob/51c7177/packages/portalnetwork/src/wire/contentLookup.ts#L36)
