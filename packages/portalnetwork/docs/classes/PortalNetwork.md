[portalnetwork](../README.md) / [Exports](../modules.md) / PortalNetwork

# Class: PortalNetwork

## Hierarchy

- `TypeRecord`<`EventEmitter`, `IPortalNetworkEvents`, `IPortalNetworkEvents`, `this`\> & `Pick`<`EventEmitter`, ``"off"`` \| ``"removeAllListeners"`` \| ``"setMaxListeners"`` \| ``"getMaxListeners"`` \| ``"listeners"`` \| ``"rawListeners"`` \| ``"listenerCount"`` \| ``"prependListener"`` \| ``"prependOnceListener"`` \| ``"eventNames"``\> & `Pick`<`OverriddenMethods`<`EventEmitter`, `IPortalNetworkEvents`, `IPortalNetworkEvents`\>, ``"on"`` \| ``"addListener"`` \| ``"removeListener"`` \| ``"once"`` \| ``"emit"``\>

  ↳ **`PortalNetwork`**

## Table of contents

### Constructors

- [constructor](PortalNetwork.md#constructor)

### Properties

- [ \_emitType](PortalNetwork.md# _emittype)
- [ \_emitterType](PortalNetwork.md# _emittertype)
- [ \_eventsType](PortalNetwork.md# _eventstype)
- [client](PortalNetwork.md#client)
- [db](PortalNetwork.md#db)
- [logger](PortalNetwork.md#logger)
- [metrics](PortalNetwork.md#metrics)
- [nodeRadius](PortalNetwork.md#noderadius)
- [refreshListener](PortalNetwork.md#refreshlistener)
- [routingTables](PortalNetwork.md#routingtables)
- [uTP](PortalNetwork.md#utp)

### Accessors

- [radius](PortalNetwork.md#radius)

### Methods

- [UtpStreamTest](PortalNetwork.md#utpstreamtest)
- [addContentToHistory](PortalNetwork.md#addcontenttohistory)
- [addListener](PortalNetwork.md#addlistener)
- [bucketRefresh](PortalNetwork.md#bucketrefresh)
- [contentLookup](PortalNetwork.md#contentlookup)
- [emit](PortalNetwork.md#emit)
- [enableLog](PortalNetwork.md#enablelog)
- [eventNames](PortalNetwork.md#eventnames)
- [getMaxListeners](PortalNetwork.md#getmaxlisteners)
- [handleFindContent](PortalNetwork.md#handlefindcontent)
- [handleFindNodes](PortalNetwork.md#handlefindnodes)
- [handleOffer](PortalNetwork.md#handleoffer)
- [handlePing](PortalNetwork.md#handleping)
- [handleStreamedContent](PortalNetwork.md#handlestreamedcontent)
- [handleUTP](PortalNetwork.md#handleutp)
- [listenerCount](PortalNetwork.md#listenercount)
- [listeners](PortalNetwork.md#listeners)
- [nodeLookup](PortalNetwork.md#nodelookup)
- [off](PortalNetwork.md#off)
- [on](PortalNetwork.md#on)
- [onTalkReq](PortalNetwork.md#ontalkreq)
- [onTalkResp](PortalNetwork.md#ontalkresp)
- [once](PortalNetwork.md#once)
- [prependListener](PortalNetwork.md#prependlistener)
- [prependOnceListener](PortalNetwork.md#prependoncelistener)
- [rawListeners](PortalNetwork.md#rawlisteners)
- [removeAllListeners](PortalNetwork.md#removealllisteners)
- [removeListener](PortalNetwork.md#removelistener)
- [sendAccept](PortalNetwork.md#sendaccept)
- [sendFindContent](PortalNetwork.md#sendfindcontent)
- [sendFindNodes](PortalNetwork.md#sendfindnodes)
- [sendOffer](PortalNetwork.md#sendoffer)
- [sendPing](PortalNetwork.md#sendping)
- [sendPong](PortalNetwork.md#sendpong)
- [sendPortalNetworkMessage](PortalNetwork.md#sendportalnetworkmessage)
- [sendUtpStreamRequest](PortalNetwork.md#sendutpstreamrequest)
- [setMaxListeners](PortalNetwork.md#setmaxlisteners)
- [start](PortalNetwork.md#start)
- [stop](PortalNetwork.md#stop)
- [updateSubnetworkRoutingTable](PortalNetwork.md#updatesubnetworkroutingtable)
- [createPortalNetwork](PortalNetwork.md#createportalnetwork)

## Constructors

### constructor

• **new PortalNetwork**(`config`, `radius?`, `db?`, `metrics?`)

Portal Network constructor

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | `IDiscv5CreateOptions` | a dictionary of `IDiscv5CreateOptions` for configuring the discv5 networking layer |
| `radius` | `bigint` | defines the radius of data the node is interesting in storing |
| `db?` | `LevelUp`<`AbstractLevelDOWN`<`any`, `any`\>, `AbstractIterator`<`any`, `any`\>\> | a `level` compliant database provided by the module consumer - instantiates an in-memory DB if not provided |
| `metrics?` | `PortalNetworkMetrics` | - |

#### Overrides

(EventEmitter as { new (): PortalNetworkEventEmitter }).constructor

#### Defined in

[packages/portalnetwork/src/client/client.ts:93](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L93)

## Properties

###  \_emitType

• `Optional` ** \_emitType**: `IPortalNetworkEvents`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }). \_emitType

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:7

___

###  \_emitterType

• `Optional` ** \_emitterType**: `EventEmitter`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }). \_emitterType

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:5

___

###  \_eventsType

• `Optional` ** \_eventsType**: `IPortalNetworkEvents`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }). \_eventsType

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:6

___

### client

• **client**: `Discv5`

#### Defined in

[packages/portalnetwork/src/client/client.ts:55](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L55)

___

### db

• **db**: `LevelUp`<`AbstractLevelDOWN`<`any`, `any`\>, `AbstractIterator`<`any`, `any`\>\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:59](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L59)

___

### logger

• **logger**: `Debugger`

#### Defined in

[packages/portalnetwork/src/client/client.ts:62](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L62)

___

### metrics

• **metrics**: `undefined` \| `PortalNetworkMetrics`

#### Defined in

[packages/portalnetwork/src/client/client.ts:61](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L61)

___

### nodeRadius

• **nodeRadius**: `bigint`

#### Defined in

[packages/portalnetwork/src/client/client.ts:58](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L58)

___

### refreshListener

• `Private` `Optional` **refreshListener**: `Timeout`

#### Defined in

[packages/portalnetwork/src/client/client.ts:60](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L60)

___

### routingTables

• **routingTables**: `Map`<[`SubNetworkIds`](../enums/SubNetworkIds.md), `RoutingTable`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:56](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L56)

___

### uTP

• **uTP**: `UtpProtocol`

#### Defined in

[packages/portalnetwork/src/client/client.ts:57](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L57)

## Accessors

### radius

• `get` **radius**(): `bigint`

#### Returns

`bigint`

the node's current radius

#### Defined in

[packages/portalnetwork/src/client/client.ts:191](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L191)

• `set` **radius**(`value`): `void`

Updates the node's radius for interested content

**`throws`** if `value` is outside correct range

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `value` | `bigint` | number representing the new radius |

#### Returns

`void`

the node's current radius

#### Defined in

[packages/portalnetwork/src/client/client.ts:200](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L200)

## Methods

### UtpStreamTest

▸ **UtpStreamTest**(`dstId`, `id`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `dstId` | `string` |
| `id` | `number` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:391](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L391)

___

### addContentToHistory

▸ **addContentToHistory**(`chainId`, `contentType`, `blockHash`, `value`): `Promise`<`void`\>

Convenience method to add content for the History Network to the DB

**`throws`** if `blockHash` or `value` is not hex string

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `chainId` | `number` | decimal number representing chain Id |
| `contentType` | `HistoryNetworkContentTypes` | content type of the data item being stored |
| `blockHash` | `string` | hex string representation of block hash |
| `value` | `Uint8Array` | hex string representing RLP encoded blockheader, block body, or block receipt |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:404](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L404)

___

### addListener

▸ **addListener**<`P`, `T`\>(`event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IPortalNetworkEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `P` |
| `listener` | (...`args`: `ListenerType`<`IPortalNetworkEvents`[`P`]\>) => `void` |

#### Returns

`T`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).addListener

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:17

▸ **addListener**(`event`, `listener`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | typeof `assignmentCompatibilityHack` |
| `listener` | (...`args`: `any`[]) => `any` |

#### Returns

`void`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).addListener

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:18

___

### bucketRefresh

▸ `Private` **bucketRefresh**(): `Promise`<`void`\>

Follows below algorithm to refresh a bucket in the History Network routing table
1: Look at your routing table and select the first N buckets which are not full.
Any value of N < 10 is probably fine here.
2: Randomly pick one of these buckets.  eighting this random selection to prefer
"larger" buckets can be done here to prioritize finding the easier to find nodes first.
3: Randomly generate a NodeID that falls within this bucket.
Do the random lookup on this node-id.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:835](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L835)

___

### contentLookup

▸ **contentLookup**(`contentType`, `blockHash`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `contentType` | `HistoryNetworkContentTypes` |
| `blockHash` | `string` |

#### Returns

`Promise`<`any`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:293](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L293)

___

### emit

▸ **emit**<`P`, `T`\>(`event`, ...`args`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IPortalNetworkEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `P` |
| `...args` | `ListenerType`<`IPortalNetworkEvents`[`P`]\> |

#### Returns

`T`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).emit

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:27

▸ **emit**(`event`, ...`args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | typeof `assignmentCompatibilityHack` |
| `...args` | `any`[] |

#### Returns

`void`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).emit

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:28

___

### enableLog

▸ **enableLog**(`namespaces?`): `void`

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `namespaces` | `string` | `'*portalnetwork*,*discv5:service*,*<uTP>*,*<uTP>:Reader*'` | comma separated list of logging namespaces defaults to "portalnetwork*, discv5:service, <uTP>*,<uTP>:Reader*" |

#### Returns

`void`

#### Defined in

[packages/portalnetwork/src/client/client.ts:182](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L182)

___

### eventNames

▸ **eventNames**(): (`string` \| `symbol`)[]

#### Returns

(`string` \| `symbol`)[]

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).eventNames

#### Defined in

node_modules/@types/node/globals.d.ts:655

___

### getMaxListeners

▸ **getMaxListeners**(): `number`

#### Returns

`number`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).getMaxListeners

#### Defined in

node_modules/@types/node/globals.d.ts:647

___

### handleFindContent

▸ `Private` **handleFindContent**(`srcId`, `message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `srcId` | `string` |
| `message` | `ITalkReqMessage` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:657](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L657)

___

### handleFindNodes

▸ `Private` **handleFindNodes**(`srcId`, `message`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `srcId` | `string` |
| `message` | `ITalkReqMessage` |

#### Returns

`void`

#### Defined in

[packages/portalnetwork/src/client/client.ts:567](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L567)

___

### handleOffer

▸ `Private` **handleOffer**(`srcId`, `message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `srcId` | `string` |
| `message` | `ITalkReqMessage` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:607](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L607)

___

### handlePing

▸ `Private` **handlePing**(`srcId`, `message`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `srcId` | `string` |
| `message` | `ITalkReqMessage` |

#### Returns

`void`

#### Defined in

[packages/portalnetwork/src/client/client.ts:555](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L555)

___

### handleStreamedContent

▸ `Private` **handleStreamedContent**(`rcvId`, `content`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `rcvId` | `number` |
| `content` | `Uint8Array` |

#### Returns

`void`

#### Defined in

[packages/portalnetwork/src/client/client.ts:544](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L544)

___

### handleUTP

▸ `Private` **handleUTP**(`srcId`, `msgId`, `packetBuffer`): `Promise`<`void`\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `srcId` | `string` | nodeID that uTP packet originates from |
| `msgId` | `bigint` | uTP message ID |
| `packetBuffer` | `Buffer` | uTP packet encoded to Buffer |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:749](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L749)

___

### listenerCount

▸ **listenerCount**(`type`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` \| `symbol` |

#### Returns

`number`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).listenerCount

#### Defined in

node_modules/@types/node/globals.d.ts:651

___

### listeners

▸ **listeners**(`event`): `Function`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |

#### Returns

`Function`[]

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).listeners

#### Defined in

node_modules/@types/node/globals.d.ts:648

___

### nodeLookup

▸ **nodeLookup**(`nodeSought`, `networkId`): `Promise`<`void`\>

Queries the 5 nearest nodes in a subnetwork's routing table for nodes in the kbucket and recursively
requests peers closer to the `nodeSought` until either the node is found or there are no more peers to query

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nodeSought` | `string` | nodeId of node sought in lookup |
| `networkId` | [`SubNetworkIds`](../enums/SubNetworkIds.md) | `SubNetworkId` of the routing table to be queried |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:857](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L857)

___

### off

▸ **off**(`event`, `listener`): `EventEmitter`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

`EventEmitter`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).off

#### Defined in

node_modules/@types/node/globals.d.ts:644

___

### on

▸ **on**<`P`, `T`\>(`event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IPortalNetworkEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `P` |
| `listener` | (...`args`: `ListenerType`<`IPortalNetworkEvents`[`P`]\>) => `void` |

#### Returns

`T`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).on

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:15

▸ **on**(`event`, `listener`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | typeof `assignmentCompatibilityHack` |
| `listener` | (...`args`: `any`[]) => `any` |

#### Returns

`void`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).on

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:16

___

### onTalkReq

▸ `Private` **onTalkReq**(`src`, `sourceId`, `message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `src` | `INodeAddress` |
| `sourceId` | ``null`` \| `ENR` |
| `message` | `ITalkReqMessage` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:487](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L487)

___

### onTalkResp

▸ `Private` **onTalkResp**(`src`, `sourceId`, `message`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `src` | `INodeAddress` |
| `sourceId` | ``null`` \| `ENR` |
| `message` | `ITalkRespMessage` |

#### Returns

`void`

#### Defined in

[packages/portalnetwork/src/client/client.ts:539](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L539)

___

### once

▸ **once**<`P`, `T`\>(`event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IPortalNetworkEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `P` |
| `listener` | (...`args`: `ListenerType`<`IPortalNetworkEvents`[`P`]\>) => `void` |

#### Returns

`T`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).once

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:25

▸ **once**(`event`, `listener`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | typeof `assignmentCompatibilityHack` |
| `listener` | (...`args`: `any`[]) => `any` |

#### Returns

`void`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).once

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:26

___

### prependListener

▸ **prependListener**(`event`, `listener`): `EventEmitter`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

`EventEmitter`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).prependListener

#### Defined in

node_modules/@types/node/globals.d.ts:653

___

### prependOnceListener

▸ **prependOnceListener**(`event`, `listener`): `EventEmitter`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

`EventEmitter`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).prependOnceListener

#### Defined in

node_modules/@types/node/globals.d.ts:654

___

### rawListeners

▸ **rawListeners**(`event`): `Function`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |

#### Returns

`Function`[]

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).rawListeners

#### Defined in

node_modules/@types/node/globals.d.ts:649

___

### removeAllListeners

▸ **removeAllListeners**(`event?`): `EventEmitter`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `string` \| `symbol` |

#### Returns

`EventEmitter`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).removeAllListeners

#### Defined in

node_modules/@types/node/globals.d.ts:645

___

### removeListener

▸ **removeListener**<`P`, `T`\>(`event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IPortalNetworkEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `P` |
| `listener` | (...`args`: `any`[]) => `any` |

#### Returns

`T`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).removeListener

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:21

▸ **removeListener**(`event`, `listener`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | typeof `assignmentCompatibilityHack` |
| `listener` | (...`args`: `any`[]) => `any` |

#### Returns

`void`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).removeListener

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:22

___

### sendAccept

▸ `Private` **sendAccept**(`srcId`, `message`, `desiredContentKeys`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `srcId` | `string` |
| `message` | `ITalkReqMessage` |
| `desiredContentKeys` | `boolean`[] |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:638](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L638)

___

### sendFindContent

▸ **sendFindContent**(`dstId`, `key`, `networkId`): `Promise`<`undefined` \| `Union`<`Uint8Array` \| [`enrs`](../modules.md#enrs)\>\>

Starts recursive lookup for content corresponding to `key`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dstId` | `string` | node id of peer |
| `key` | `Uint8Array` | content key defined by the subnetwork spec |
| `networkId` | [`SubNetworkIds`](../enums/SubNetworkIds.md) | subnetwork ID on which content is being sought |

#### Returns

`Promise`<`undefined` \| `Union`<`Uint8Array` \| [`enrs`](../modules.md#enrs)\>\>

the value of the FOUNDCONTENT response or undefined

#### Defined in

[packages/portalnetwork/src/client/client.ts:306](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L306)

___

### sendFindNodes

▸ **sendFindNodes**(`dstId`, `distances`, `networkId`): `Promise`<`undefined` \| [`NodesMessage`](../modules.md#nodesmessage)\>

Sends a Portal Network FINDNODES request to a peer requesting other node ENRs

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dstId` | `string` | node id of peer |
| `distances` | `Uint16Array` | distances as defined by subnetwork for node ENRs being requested |
| `networkId` | [`SubNetworkIds`](../enums/SubNetworkIds.md) | subnetwork id for message being |

#### Returns

`Promise`<`undefined` \| [`NodesMessage`](../modules.md#nodesmessage)\>

a {@link `NodesMessage`} or undefined

#### Defined in

[packages/portalnetwork/src/client/client.ts:258](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L258)

___

### sendOffer

▸ **sendOffer**(`dstId`, `contentKeys`, `networkId`): `Promise`<`undefined` \| `List`<`Boolean`\>\>

Offers content corresponding to `contentKeys` to peer corresponding to `dstId`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dstId` | `string` | node ID of a peer |
| `contentKeys` | `Uint8Array`[] | content keys being offered as specified by the subnetwork |
| `networkId` | [`SubNetworkIds`](../enums/SubNetworkIds.md) | network ID of subnetwork being used |

#### Returns

`Promise`<`undefined` \| `List`<`Boolean`\>\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:356](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L356)

___

### sendPing

▸ **sendPing**(`nodeId`, `networkId`): `Promise`<`undefined` \| [`PongMessage`](../modules.md#pongmessage)\>

Sends a Portal Network Wire Protocol PING message to a specified node

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nodeId` | `string` | - |
| `networkId` | [`SubNetworkIds`](../enums/SubNetworkIds.md) | subnetwork ID |

#### Returns

`Promise`<`undefined` \| [`PongMessage`](../modules.md#pongmessage)\>

the PING payload specified by the subnetwork or undefined

#### Defined in

[packages/portalnetwork/src/client/client.ts:215](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L215)

___

### sendPong

▸ `Private` **sendPong**(`srcId`, `reqId`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `srcId` | `string` |
| `reqId` | `bigint` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:474](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L474)

___

### sendPortalNetworkMessage

▸ **sendPortalNetworkMessage**(`dstId`, `payload`, `networkId`): `Promise`<`Buffer`\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dstId` | `string` | `NodeId` of message recipient |
| `payload` | `Buffer` | `Buffer` serialized payload of message |
| `networkId` | [`SubNetworkIds`](../enums/SubNetworkIds.md) | Subnetwork ID of Subnetwork message is being sent on |

#### Returns

`Promise`<`Buffer`\>

response from `dstId` as `Buffer` or null `Buffer`

#### Defined in

[packages/portalnetwork/src/client/client.ts:804](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L804)

___

### sendUtpStreamRequest

▸ **sendUtpStreamRequest**(`dstId`, `id`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `dstId` | `string` |
| `id` | `number` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:387](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L387)

___

### setMaxListeners

▸ **setMaxListeners**(`n`): `EventEmitter`

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

`EventEmitter`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).setMaxListeners

#### Defined in

node_modules/@types/node/globals.d.ts:646

___

### start

▸ **start**(): `Promise`<`void`\>

Starts the portal network client

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:145](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L145)

___

### stop

▸ **stop**(): `Promise`<`void`\>

Stops the portal network client and cleans up listeners

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:170](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L170)

___

### updateSubnetworkRoutingTable

▸ `Private` **updateSubnetworkRoutingTable**(`srcId`, `networkId`, `customPayload?`): `void`

This method maintains the liveness of peers in the Subnetwork routing tables.  If a PONG message is received from
an unknown peer for a given subnetwork, that peer is added to the corresponding subnetwork routing table.  If this
method is called with no `customPayload`, this indicates the peer corresponding to `srcId` should be removed from
the specified subnetwork routing table.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `srcId` | `string` | nodeId of peer being updated in subnetwork routing table |
| `networkId` | [`SubNetworkIds`](../enums/SubNetworkIds.md) | subnetwork Id of routing table being updated |
| `customPayload?` | `any` | payload of the PING/PONG message being decoded |

#### Returns

`void`

#### Defined in

[packages/portalnetwork/src/client/client.ts:765](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L765)

___

### createPortalNetwork

▸ `Static` **createPortalNetwork**(`ip`, `proxyAddress?`): `Promise`<[`PortalNetwork`](PortalNetwork.md)\>

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `ip` | `string` | `undefined` | initial local IP address of node |
| `proxyAddress` | `string` | `'127.0.0.1'` | IP address of proxy |

#### Returns

`Promise`<[`PortalNetwork`](PortalNetwork.md)\>

a new PortalNetwork instance

#### Defined in

[packages/portalnetwork/src/client/client.ts:70](https://github.com/ethereumjs/ultralight/blob/3d9e050/packages/portalnetwork/src/client/client.ts#L70)
