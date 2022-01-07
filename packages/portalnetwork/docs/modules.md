[portalnetwork](README.md) / Exports

# portalnetwork

## Table of contents

### Enumerations

- [MessageCodes](enums/MessageCodes.md)
- [SubNetworkIds](enums/SubNetworkIds.md)

### Classes

- [PortalNetwork](classes/PortalNetwork.md)
- [StateNetworkRoutingTable](classes/StateNetworkRoutingTable.md)

### Type aliases

- [AcceptMessage](modules.md#acceptmessage)
- [ContentMessage](modules.md#contentmessage)
- [FindContentMessage](modules.md#findcontentmessage)
- [FindNodesMessage](modules.md#findnodesmessage)
- [MessageTypeUnion](modules.md#messagetypeunion)
- [NodesMessage](modules.md#nodesmessage)
- [OfferMessage](modules.md#offermessage)
- [PingMessage](modules.md#pingmessage)
- [PongMessage](modules.md#pongmessage)
- [connectionId](modules.md#connectionid)
- [content](modules.md#content)
- [enrs](modules.md#enrs)

### Variables

- [AcceptMessageType](modules.md#acceptmessagetype)
- [ByteList](modules.md#bytelist)
- [Bytes2](modules.md#bytes2)
- [ContentMessageType](modules.md#contentmessagetype)
- [ENRs](modules.md#enrs)
- [FindContentMessageType](modules.md#findcontentmessagetype)
- [FindNodesMessageType](modules.md#findnodesmessagetype)
- [NodesMessageType](modules.md#nodesmessagetype)
- [OfferMessageType](modules.md#offermessagetype)
- [PingMessageType](modules.md#pingmessagetype)
- [PingPongCustomDataType](modules.md#pingpongcustomdatatype)
- [PongMessageType](modules.md#pongmessagetype)
- [PortalWireMessageType](modules.md#portalwiremessagetype)

### Functions

- [distance](modules.md#distance)

## Type aliases

### AcceptMessage

Ƭ **AcceptMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `connectionId` | `Uint8Array` |
| `contentKeys` | `List`<`Boolean`\> |

#### Defined in

[packages/portalnetwork/src/wire/types.ts:127](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L127)

___

### ContentMessage

Ƭ **ContentMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `content` | `Uint8Array` \| `Uint8Array`[] |

#### Defined in

[packages/portalnetwork/src/wire/types.ts:104](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L104)

___

### FindContentMessage

Ƭ **FindContentMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentKey` | `Uint8Array` |

#### Defined in

[packages/portalnetwork/src/wire/types.ts:94](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L94)

___

### FindNodesMessage

Ƭ **FindNodesMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `distances` | `Uint16Array` |

#### Defined in

[packages/portalnetwork/src/wire/types.ts:72](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L72)

___

### MessageTypeUnion

Ƭ **MessageTypeUnion**: [`PingMessage`](modules.md#pingmessage) \| [`PongMessage`](modules.md#pongmessage) \| [`FindNodesMessage`](modules.md#findnodesmessage) \| [`NodesMessage`](modules.md#nodesmessage) \| [`FindContentMessage`](modules.md#findcontentmessage) \| [`ContentMessage`](modules.md#contentmessage) \| [`OfferMessage`](modules.md#offermessage) \| [`AcceptMessage`](modules.md#acceptmessage)

#### Defined in

[packages/portalnetwork/src/wire/types.ts:139](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L139)

___

### NodesMessage

Ƭ **NodesMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `enrs` | `Uint8Array`[] |
| `total` | `number` |

#### Defined in

[packages/portalnetwork/src/wire/types.ts:82](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L82)

___

### OfferMessage

Ƭ **OfferMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentKeys` | `Uint8Array`[] |

#### Defined in

[packages/portalnetwork/src/wire/types.ts:117](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L117)

___

### PingMessage

Ƭ **PingMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `customPayload` | `ByteVector` |
| `enrSeq` | `bigint` |

#### Defined in

[packages/portalnetwork/src/wire/types.ts:48](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L48)

___

### PongMessage

Ƭ **PongMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `customPayload` | `ByteVector` |
| `enrSeq` | `bigint` |

#### Defined in

[packages/portalnetwork/src/wire/types.ts:53](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L53)

___

### connectionId

Ƭ **connectionId**: `Uint8Array`

#### Defined in

[packages/portalnetwork/src/wire/types.ts:108](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L108)

___

### content

Ƭ **content**: `Uint8Array`

#### Defined in

[packages/portalnetwork/src/wire/types.ts:110](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L110)

___

### enrs

Ƭ **enrs**: `Uint8Array`[]

#### Defined in

[packages/portalnetwork/src/wire/types.ts:112](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L112)

## Variables

### AcceptMessageType

• **AcceptMessageType**: `ContainerType`<`ObjectLike`\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:132](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L132)

___

### ByteList

• **ByteList**: `ListType`<`List`<`any`\>\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:45](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L45)

___

### Bytes2

• **Bytes2**: `ByteVectorType`

#### Defined in

[packages/portalnetwork/src/wire/types.ts:46](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L46)

___

### ContentMessageType

• **ContentMessageType**: `UnionType`<`Union`<`Uint8Array` \| [`enrs`](modules.md#enrs)\>\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:114](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L114)

___

### ENRs

• **ENRs**: `ListType`<`List`<`any`\>\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:47](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L47)

___

### FindContentMessageType

• **FindContentMessageType**: `ContainerType`<`ObjectLike`\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:98](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L98)

___

### FindNodesMessageType

• **FindNodesMessageType**: `ContainerType`<`ObjectLike`\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:76](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L76)

___

### NodesMessageType

• **NodesMessageType**: `ContainerType`<`ObjectLike`\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:87](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L87)

___

### OfferMessageType

• **OfferMessageType**: `ContainerType`<`ObjectLike`\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:121](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L121)

___

### PingMessageType

• **PingMessageType**: `ContainerType`<`ObjectLike`\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:58](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L58)

___

### PingPongCustomDataType

• **PingPongCustomDataType**: `ContainerType`<`ObjectLike`\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:26](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L26)

___

### PongMessageType

• **PongMessageType**: `ContainerType`<`ObjectLike`\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:65](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L65)

___

### PortalWireMessageType

• **PortalWireMessageType**: `UnionType`<`Union`<[`MessageTypeUnion`](modules.md#messagetypeunion)\>\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:148](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/wire/types.ts#L148)

## Functions

### distance

▸ `Const` **distance**(`id1`, `id2`): `bigint`

Calculates the distance between two ids using the distance function defined here
https://github.com/ethereum/portal-network-specs/blob/master/state-network.md#distance-function

#### Parameters

| Name | Type |
| :------ | :------ |
| `id1` | `bigint` |
| `id2` | `bigint` |

#### Returns

`bigint`

#### Defined in

[packages/portalnetwork/src/stateSubnetwork/util.ts:8](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/stateSubnetwork/util.ts#L8)
