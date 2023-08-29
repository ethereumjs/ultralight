[portalnetwork](README.md) / Exports

# portalnetwork

## Table of contents

### Enumerations

- [MessageCodes](enums/MessageCodes.md)
- [ProtocolId](enums/ProtocolId.md)

### Classes

- [CapacitorUDPTransportService](classes/CapacitorUDPTransportService.md)
- [ENR](classes/ENR.md)
- [HeaderAccumulator](classes/HeaderAccumulator.md)
- [PortalNetwork](classes/PortalNetwork.md)
- [StateNetworkRoutingTable](classes/StateNetworkRoutingTable.md)
- [WebSocketTransportService](classes/WebSocketTransportService.md)

### Interfaces

- [IDiscv5CreateOptions](interfaces/IDiscv5CreateOptions.md)

### Type Aliases

- [AcceptMessage](modules.md#acceptmessage)
- [ContentMessage](modules.md#contentmessage)
- [FindContentMessage](modules.md#findcontentmessage)
- [FindNodesMessage](modules.md#findnodesmessage)
- [HeaderRecordType](modules.md#headerrecordtype)
- [ContentKey](modules.md#historynetworkcontentkey)
- [MessageTypeUnion](modules.md#messagetypeunion)
- [NodeId](modules.md#nodeid)
- [NodesMessage](modules.md#nodesmessage)
- [OfferMessage](modules.md#offermessage)
- [PingMessage](modules.md#pingmessage)
- [PingPongCustomData](modules.md#pingpongcustomdata)
- [PongMessage](modules.md#pongmessage)
- [ProofView](modules.md#proofview)
- [connectionId](modules.md#connectionid)
- [content](modules.md#content)
- [enrs](modules.md#enrs)

### Variables

- [AcceptMessageType](modules.md#acceptmessagetype)
- [ByteList](modules.md#bytelist)
- [Bytes2](modules.md#bytes2)
- [ContentMessageType](modules.md#contentmessagetype)
- [ENRs](modules.md#enrs-1)
- [EPOCH\_SIZE](modules.md#epoch_size)
- [EpochAccumulator](modules.md#epochaccumulator)
- [FindContentMessageType](modules.md#findcontentmessagetype)
- [FindNodesMessageType](modules.md#findnodesmessagetype)
- [HeaderAccumulatorType](modules.md#headeraccumulatortype)
- [HeaderRecord](modules.md#headerrecord)
- [ContentKeyUnionType](modules.md#historynetworkcontentkeyuniontype)
- [MEGABYTE](modules.md#megabyte)
- [NodesMessageType](modules.md#nodesmessagetype)
- [OfferMessageType](modules.md#offermessagetype)
- [PingMessageType](modules.md#pingmessagetype)
- [PingPongCustomDataType](modules.md#pingpongcustomdatatype)
- [PongMessageType](modules.md#pongmessagetype)
- [PortalWireMessageType](modules.md#portalwiremessagetype)
- [connectionIdType](modules.md#connectionidtype)

### Functions

- [addRLPSerializedBlock](modules.md#addrlpserializedblock)
- [createKeypairFromPeerId](modules.md#createkeypairfrompeerid)
- [dirSize](modules.md#dirsize)
- [distance](modules.md#distance)
- [fromHexString](modules.md#fromhexstring)
- [generateRandomNodeIdAtDistance](modules.md#generaterandomnodeidatdistance)
- [getContentId](modules.md#getContentId)
- [log2Distance](modules.md#log2distance)
- [reassembleBlock](modules.md#reassembleblock)
- [serializedContentKeyToContentId](modules.md#serializedcontentkeytocontentid)
- [shortId](modules.md#shortid)
- [toHexString](modules.md#tohexstring)
- [viewProof](modules.md#viewproof)

## Type Aliases

### AcceptMessage

Ƭ **AcceptMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `connectionId` | `Uint8Array` |
| `contentKeys` | `BitArray` |

#### Defined in

[packages/portalnetwork/src/wire/types.ts:104](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L104)

___

### ContentMessage

Ƭ **ContentMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `selector` | `number` |
| `value` | [`connectionId`](modules.md#connectionid) \| [`content`](modules.md#content) \| [`enrs`](modules.md#enrs) |

#### Defined in

[packages/portalnetwork/src/wire/types.ts:83](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L83)

___

### FindContentMessage

Ƭ **FindContentMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentKey` | `Uint8Array` |

#### Defined in

[packages/portalnetwork/src/wire/types.ts:75](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L75)

___

### FindNodesMessage

Ƭ **FindNodesMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `distances` | `number`[] |

#### Defined in

[packages/portalnetwork/src/wire/types.ts:57](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L57)

___

### HeaderRecordType

Ƭ **HeaderRecordType**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `blockHash` | `Uint8Array` |
| `totalDifficulty` | `bigint` |

#### Defined in

[packages/portalnetwork/src/subprotocols/headerGossip/types.ts:11](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/headerGossip/types.ts#L11)

___

### ContentKey

Ƭ **ContentKey**: `Object`

**`property`** chainId - integer representing the chain ID (e.g. Ethereum Mainnet is 1)

**`property`** blockHash - byte representation of the hex encoded block hash

#### Type declaration

| Name | Type |
| :------ | :------ |
| `blockHash` | `Uint8Array` |
| `chainId` | `number` |

#### Defined in

[packages/portalnetwork/src/subprotocols/history/types.ts:8](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/history/types.ts#L8)

___

### MessageTypeUnion

Ƭ **MessageTypeUnion**: [[`PingMessage`](modules.md#pingmessage) \| [`PongMessage`](modules.md#pongmessage) \| [`FindNodesMessage`](modules.md#findnodesmessage) \| [`NodesMessage`](modules.md#nodesmessage) \| [`FindContentMessage`](modules.md#findcontentmessage) \| [`ContentMessage`](modules.md#contentmessage) \| [`OfferMessage`](modules.md#offermessage) \| [`AcceptMessage`](modules.md#acceptmessage)]

#### Defined in

[packages/portalnetwork/src/wire/types.ts:114](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L114)

___

### NodeId

Ƭ **NodeId**: `string`

We represent NodeId as a hex string, since node equality is used very heavily
and it is convenient to index data by NodeId

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/types.d.ts:5

___

### NodesMessage

Ƭ **NodesMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `enrs` | `Uint8Array`[] |
| `total` | `number` |

#### Defined in

[packages/portalnetwork/src/wire/types.ts:65](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L65)

___

### OfferMessage

Ƭ **OfferMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentKeys` | `Uint8Array`[] |

#### Defined in

[packages/portalnetwork/src/wire/types.ts:96](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L96)

___

### PingMessage

Ƭ **PingMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `customPayload` | [`PingPongCustomData`](modules.md#pingpongcustomdata) |
| `enrSeq` | `bigint` |

#### Defined in

[packages/portalnetwork/src/wire/types.ts:37](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L37)

___

### PingPongCustomData

Ƭ **PingPongCustomData**: `Uint8Array`

#### Defined in

[packages/portalnetwork/src/wire/types.ts:19](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L19)

___

### PongMessage

Ƭ **PongMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `customPayload` | [`PingPongCustomData`](modules.md#pingpongcustomdata) |
| `enrSeq` | `bigint` |

#### Defined in

[packages/portalnetwork/src/wire/types.ts:42](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L42)

___

### ProofView

Ƭ **ProofView**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `gIndex` | `bigint` |
| `leaf` | `Uint8Array` |
| `type` | `string` |
| `witness` | `Uint8Array`[] |

#### Defined in

[packages/portalnetwork/src/subprotocols/headerGossip/types.ts:22](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/headerGossip/types.ts#L22)

___

### connectionId

Ƭ **connectionId**: `Uint8Array`

#### Defined in

[packages/portalnetwork/src/wire/types.ts:88](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L88)

___

### content

Ƭ **content**: `Uint8Array`

#### Defined in

[packages/portalnetwork/src/wire/types.ts:90](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L90)

___

### enrs

Ƭ **enrs**: `Uint8Array`[]

#### Defined in

[packages/portalnetwork/src/wire/types.ts:92](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L92)

## Variables

### AcceptMessageType

• `Const` **AcceptMessageType**: `ContainerType`<{ `connectionId`: `ByteVectorType` = Bytes2; `contentKeys`: `BitListType`  }\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:109](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L109)

___

### ByteList

• `Const` **ByteList**: `ByteListType`

#### Defined in

[packages/portalnetwork/src/wire/types.ts:34](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L34)

___

### Bytes2

• `Const` **Bytes2**: `ByteVectorType`

#### Defined in

[packages/portalnetwork/src/wire/types.ts:35](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L35)

___

### ContentMessageType

• `Const` **ContentMessageType**: `UnionType`<(`ByteVectorType` \| `ByteListType` \| `ListCompositeType`<`ByteListType`\>)[]\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:95](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L95)

___

### ENRs

• `Const` **ENRs**: `ListCompositeType`<`ByteListType`\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:36](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L36)

___

### EPOCH\_SIZE

• `Const` **EPOCH\_SIZE**: ``8192``

#### Defined in

[packages/portalnetwork/src/subprotocols/headerGossip/types.ts:3](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/headerGossip/types.ts#L3)

___

### EpochAccumulator

• `Const` **EpochAccumulator**: `ListCompositeType`<`ContainerType`<{ `blockHash`: `ByteVectorType` ; `totalDifficulty`: `UintBigintType`  }\>\>

#### Defined in

[packages/portalnetwork/src/subprotocols/headerGossip/types.ts:15](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/headerGossip/types.ts#L15)

___

### FindContentMessageType

• `Const` **FindContentMessageType**: `ContainerType`<{ `contentKey`: `ByteListType` = ByteList }\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:79](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L79)

___

### FindNodesMessageType

• `Const` **FindNodesMessageType**: `ContainerType`<{ `distances`: `ListBasicType`<`UintNumberType`\>  }\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:61](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L61)

___

### HeaderAccumulatorType

• `Const` **HeaderAccumulatorType**: `ContainerType`<{ `currentEpoch`: `ListCompositeType`<`ContainerType`<{ `blockHash`: `ByteVectorType` ; `totalDifficulty`: `UintBigintType`  }\>\> = EpochAccumulator; `historicalEpochs`: `ListCompositeType`<`ByteVectorType`\>  }\>

#### Defined in

[packages/portalnetwork/src/subprotocols/headerGossip/types.ts:17](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/headerGossip/types.ts#L17)

___

### HeaderRecord

• `Const` **HeaderRecord**: `ContainerType`<{ `blockHash`: `ByteVectorType` ; `totalDifficulty`: `UintBigintType`  }\>

#### Defined in

[packages/portalnetwork/src/subprotocols/headerGossip/types.ts:6](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/headerGossip/types.ts#L6)

___

### ContentKeyUnionType

• `Const` **ContentKeyUnionType**: `UnionType`<`ContainerType`<{ `blockHash`: `ByteVectorType` ; `chainId`: `UintNumberType`  }\>[]\>

#### Defined in

[packages/portalnetwork/src/subprotocols/history/types.ts:22](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/history/types.ts#L22)

___

### MEGABYTE

• `Const` **MEGABYTE**: ``1048576``

#### Defined in

[packages/portalnetwork/src/util/util.ts:8](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/util/util.ts#L8)

___

### NodesMessageType

• `Const` **NodesMessageType**: `ContainerType`<{ `enrs`: `ListCompositeType`<`ByteListType`\> = ENRs; `total`: `UintNumberType`  }\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:70](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L70)

___

### OfferMessageType

• `Const` **OfferMessageType**: `ContainerType`<{ `contentKeys`: `ListCompositeType`<`ByteListType`\>  }\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:100](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L100)

___

### PingMessageType

• `Const` **PingMessageType**: `ContainerType`<{ `customPayload`: `ByteListType` = ByteList; `enrSeq`: `UintBigintType`  }\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:47](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L47)

___

### PingPongCustomDataType

• `Const` **PingPongCustomDataType**: `ContainerType`<{ `radius`: `UintBigintType`  }\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:15](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L15)

___

### PongMessageType

• `Const` **PongMessageType**: `ContainerType`<{ `customPayload`: `ByteListType` = ByteList; `enrSeq`: `UintBigintType`  }\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:52](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L52)

___

### PortalWireMessageType

• `Const` **PortalWireMessageType**: `UnionType`<(`ContainerType`<{ `customPayload`: `ByteListType` = ByteList; `enrSeq`: `UintBigintType`  }\> \| `ContainerType`<{ `distances`: `ListBasicType`<`UintNumberType`\>  }\> \| `ContainerType`<{ `enrs`: `ListCompositeType`<`ByteListType`\> = ENRs; `total`: `UintNumberType`  }\> \| `ContainerType`<{ `contentKey`: `ByteListType` = ByteList }\> \| `UnionType`<(`ByteVectorType` \| `ByteListType` \| `ListCompositeType`<`ByteListType`\>)[]\> \| `ContainerType`<{ `contentKeys`: `ListCompositeType`<`ByteListType`\>  }\> \| `ContainerType`<{ `connectionId`: `ByteVectorType` = Bytes2; `contentKeys`: `BitListType`  }\>)[]\>

#### Defined in

[packages/portalnetwork/src/wire/types.ts:124](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L124)

___

### connectionIdType

• `Const` **connectionIdType**: `UintNumberType`

#### Defined in

[packages/portalnetwork/src/wire/types.ts:94](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/wire/types.ts#L94)

## Functions

### addRLPSerializedBlock

▸ **addRLPSerializedBlock**(`rlpHex`, `blockHash`, `protocol`): `Promise`<`void`\>

Takes an RLP encoded block as a hex string and adds the block header and block body to the `portal` content DB

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `rlpHex` | `string` | RLP encoded block as hex string |
| `blockHash` | `string` | block hash as 0x prefixed hex string |
| `protocol` | `HistoryProtocol` | - |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/subprotocols/history/util.ts:55](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/history/util.ts#L55)

___

### createKeypairFromPeerId

▸ **createKeypairFromPeerId**(`peerId`): `IKeypair`

#### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `PeerId` |

#### Returns

`IKeypair`

#### Defined in

node_modules/@chainsafe/discv5/lib/keypair/index.d.ts:9

___

### dirSize

▸ **dirSize**(`directory`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `directory` | `string` |

#### Returns

`Promise`<`number`\>

#### Defined in

[packages/portalnetwork/src/util/util.ts:43](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/util/util.ts#L43)

___

### distance

▸ **distance**(`id1`, `id2`): `bigint`

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

[packages/portalnetwork/src/subprotocols/state/util.ts:8](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/state/util.ts#L8)

___

### fromHexString

▸ **fromHexString**(`hex`): `Uint8Array`

#### Parameters

| Name | Type |
| :------ | :------ |
| `hex` | `string` |

#### Returns

`Uint8Array`

#### Defined in

node_modules/@chainsafe/ssz/lib/util/byteArray.d.ts:3

___

### generateRandomNodeIdAtDistance

▸ **generateRandomNodeIdAtDistance**(`nodeId`, `targetDistance`): `string`

Generates a random node ID at the specified target log2 distance (i.e. generates a random node ID in a given k-bucket)
Follows this algorithm - https://github.com/ethereum/trin/pull/213

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nodeId` | `string` | id of the node to calculate distance from |
| `targetDistance` | `number` | the target log2 distance to generate a nodeId at |

#### Returns

`string`

a random node ID at a log2 distance of `targetDistance`

#### Defined in

[packages/portalnetwork/src/util/util.ts:24](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/util/util.ts#L24)

___

### getContentId

▸ **getContentId**(`chainId`, `blockHash`, `contentType`): `string`

Generates the Content ID used to calculate the distance between a node ID and the content Key

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `chainId` | `number` | - |
| `blockHash` | `string` | - |
| `contentType` | `HistoryNetworkContentType` | a number identifying the type of content (block header, block body, receipt) |

#### Returns

`string`

the hex encoded string representation of the SHA256 hash of the serialized contentKey

#### Defined in

[packages/portalnetwork/src/subprotocols/history/util.ts:14](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/history/util.ts#L14)

___

### log2Distance

▸ **log2Distance**(`a`, `b`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `a` | `string` |
| `b` | `string` |

#### Returns

`number`

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/util.d.ts:6

___

### reassembleBlock

▸ **reassembleBlock**(`rawHeader`, `rawBody`): `Block`

Assembles RLP encoded block headers and bodies from the portal network into a `Block` object

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `rawHeader` | `Uint8Array` | RLP encoded block header as Uint8Array |
| `rawBody` | `Uint8Array` | RLP encoded block body consisting of transactions and uncles as nested Uint8Arrays |

#### Returns

`Block`

a `Block` object assembled from the header and body provided

#### Defined in

[packages/portalnetwork/src/subprotocols/history/util.ts:35](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/history/util.ts#L35)

___

### serializedContentKeyToContentId

▸ **serializedContentKeyToContentId**(`contentKey`): `string`

Generates the Content ID used to calculate the distance between a node ID and the content key

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `contentKey` | `Uint8Array` | a serialized content key |

#### Returns

`string`

the hex encoded string representation of the SHA256 hash of the serialized contentKey

#### Defined in

[packages/portalnetwork/src/util/util.ts:39](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/util/util.ts#L39)

___

### shortId

▸ **shortId**(`nodeId`): `string`

 Shortens a Node ID to a readable length

#### Parameters

| Name | Type |
| :------ | :------ |
| `nodeId` | `string` |

#### Returns

`string`

#### Defined in

[packages/portalnetwork/src/util/util.ts:13](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/util/util.ts#L13)

___

### toHexString

▸ **toHexString**(`bytes`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `bytes` | `Uint8Array` \| `ByteVector` |

#### Returns

`string`

#### Defined in

node_modules/@chainsafe/ssz/lib/util/byteArray.d.ts:2

___

### viewProof

▸ **viewProof**(`proof`): [`ProofView`](modules.md#proofview)

#### Parameters

| Name | Type |
| :------ | :------ |
| `proof` | `Proof` |

#### Returns

[`ProofView`](modules.md#proofview)

#### Defined in

[packages/portalnetwork/src/subprotocols/headerGossip/util.ts:4](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/headerGossip/util.ts#L4)
