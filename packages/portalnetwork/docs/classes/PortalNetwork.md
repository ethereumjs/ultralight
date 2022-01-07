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
- [historyNetworkRoutingTable](PortalNetwork.md#historynetworkroutingtable)
- [nodeRadius](PortalNetwork.md#noderadius)
- [refreshListener](PortalNetwork.md#refreshlistener)
- [stateNetworkRoutingTable](PortalNetwork.md#statenetworkroutingtable)
- [uTP](PortalNetwork.md#utp)

### Accessors

- [radius](PortalNetwork.md#radius)

### Methods

- [addContentToHistory](PortalNetwork.md#addcontenttohistory)
- [addListener](PortalNetwork.md#addlistener)
- [bucketRefresh](PortalNetwork.md#bucketrefresh)
- [emit](PortalNetwork.md#emit)
- [enableLog](PortalNetwork.md#enablelog)
- [eventNames](PortalNetwork.md#eventnames)
- [getMaxListeners](PortalNetwork.md#getmaxlisteners)
- [handleContent](PortalNetwork.md#handlecontent)
- [handleFindContent](PortalNetwork.md#handlefindcontent)
- [handleFindNodes](PortalNetwork.md#handlefindnodes)
- [handleOffer](PortalNetwork.md#handleoffer)
- [handlePing](PortalNetwork.md#handleping)
- [handleStreamedContent](PortalNetwork.md#handlestreamedcontent)
- [handleUTP](PortalNetwork.md#handleutp)
- [listenerCount](PortalNetwork.md#listenercount)
- [listeners](PortalNetwork.md#listeners)
- [log](PortalNetwork.md#log)
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

• **new PortalNetwork**(`config`, `radius?`, `db?`)

Portal Network constructor

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `config` | `IDiscv5CreateOptions` | `undefined` | a dictionary of `IDiscv5CreateOptions` for configuring the discv5 networking layer |
| `radius` | `number` | `1` | defines the radius of data the node is interesting in storing |
| `db?` | `LevelUp`<`AbstractLevelDOWN`<`any`, `any`\>, `AbstractIterator`<`any`, `any`\>\> | `undefined` | a `level` compliant database provided by the module consumer - instantiates an in-memory DB if not provided |

#### Overrides

(EventEmitter as { new (): PortalNetworkEventEmitter }).constructor

#### Defined in

[packages/portalnetwork/src/client/client.ts:88](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L88)

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

[packages/portalnetwork/src/client/client.ts:51](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L51)

___

### db

• **db**: `LevelUp`<`AbstractLevelDOWN`<`any`, `any`\>, `AbstractIterator`<`any`, `any`\>\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:56](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L56)

___

### historyNetworkRoutingTable

• **historyNetworkRoutingTable**: `PortalNetworkRoutingTable`

#### Defined in

[packages/portalnetwork/src/client/client.ts:53](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L53)

___

### nodeRadius

• **nodeRadius**: `number`

#### Defined in

[packages/portalnetwork/src/client/client.ts:55](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L55)

___

### refreshListener

• `Private` **refreshListener**: `Timeout`

#### Defined in

[packages/portalnetwork/src/client/client.ts:57](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L57)

___

### stateNetworkRoutingTable

• **stateNetworkRoutingTable**: [`StateNetworkRoutingTable`](StateNetworkRoutingTable.md)

#### Defined in

[packages/portalnetwork/src/client/client.ts:52](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L52)

___

### uTP

• **uTP**: `UtpProtocol`

#### Defined in

[packages/portalnetwork/src/client/client.ts:54](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L54)

## Accessors

### radius

• `get` **radius**(): `number`

#### Returns

`number`

the node's current radius

#### Defined in

[packages/portalnetwork/src/client/client.ts:162](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L162)

• `set` **radius**(`value`): `void`

Updates the node's radius for interested content

**`throws`** if `value` is outside correct range

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `value` | `number` | number representing the new radius |

#### Returns

`void`

the node's current radius

#### Defined in

[packages/portalnetwork/src/client/client.ts:171](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L171)

## Methods

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
| `value` | `string` | hex string representing RLP encoded blockheader, block body, or block receipt |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:393](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L393)

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

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:811](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L811)

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
| `namespaces` | `string` | `'portalnetwork*,discv5:service*,<uTP>*,<uTP>:Reader*'` | comma separated list of logging namespaces defaults to "portalnetwork*, discv5:service, <uTP>*,<uTP>:Reader*" |

#### Returns

`void`

#### Defined in

[packages/portalnetwork/src/client/client.ts:153](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L153)

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

### handleContent

▸ `Private` **handleContent**(`srcId`, `message`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `srcId` | `string` |
| `message` | `ITalkReqMessage` |

#### Returns

`void`

#### Defined in

[packages/portalnetwork/src/client/client.ts:541](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L541)

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

[packages/portalnetwork/src/client/client.ts:641](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L641)

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

[packages/portalnetwork/src/client/client.ts:560](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L560)

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

[packages/portalnetwork/src/client/client.ts:597](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L597)

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

[packages/portalnetwork/src/client/client.ts:548](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L548)

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

[packages/portalnetwork/src/client/client.ts:529](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L529)

___

### handleUTP

▸ `Private` **handleUTP**(`srcId`, `msgId`, `packetBuffer`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `srcId` | `string` |
| `msgId` | `bigint` |
| `packetBuffer` | `Buffer` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:723](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L723)

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

### log

▸ **log**(`msg`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `any` |

#### Returns

`void`

#### Defined in

[packages/portalnetwork/src/client/client.ts:115](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L115)

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

[packages/portalnetwork/src/client/client.ts:472](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L472)

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

[packages/portalnetwork/src/client/client.ts:524](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L524)

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

▸ `Private` **sendAccept**(`srcId`, `message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `srcId` | `string` |
| `message` | `ITalkReqMessage` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:625](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L625)

___

### sendFindContent

▸ **sendFindContent**(`dstId`, `key`, `networkId`): `Promise`<`undefined` \| `Uint8Array` \| [`enrs`](../modules.md#enrs)\>

Starts recursive lookup for content corresponding to `key`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dstId` | `string` | node id of peer |
| `key` | `Uint8Array` | content key defined by the subnetwork spec |
| `networkId` | [`SubNetworkIds`](../enums/SubNetworkIds.md) | subnetwork ID on which content is being sought |

#### Returns

`Promise`<`undefined` \| `Uint8Array` \| [`enrs`](../modules.md#enrs)\>

the value of the FOUNDCONTENT response or undefined

#### Defined in

[packages/portalnetwork/src/client/client.ts:277](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L277)

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

[packages/portalnetwork/src/client/client.ts:218](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L218)

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

[packages/portalnetwork/src/client/client.ts:349](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L349)

___

### sendPing

▸ **sendPing**(`dstId`, `networkId`): `Promise`<`undefined` \| [`PongMessage`](../modules.md#pongmessage)\>

Sends a Portal Network Wire Protocol PING message to a specified node

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `dstId` | `string` | the nodeId of the peer to send a ping to |
| `networkId` | [`SubNetworkIds`](../enums/SubNetworkIds.md) | subnetwork ID |

#### Returns

`Promise`<`undefined` \| [`PongMessage`](../modules.md#pongmessage)\>

the PING payload specified by the subnetwork or undefined

#### Defined in

[packages/portalnetwork/src/client/client.ts:185](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L185)

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

[packages/portalnetwork/src/client/client.ts:459](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L459)

___

### sendPortalNetworkMessage

▸ `Private` **sendPortalNetworkMessage**(`dstId`, `payload`, `networkId`): `Promise`<`Buffer`\>

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

[packages/portalnetwork/src/client/client.ts:796](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L796)

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

[packages/portalnetwork/src/client/client.ts:380](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L380)

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

[packages/portalnetwork/src/client/client.ts:132](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L132)

___

### stop

▸ **stop**(): `Promise`<`void`\>

Stops the portal network client and cleans up listeners

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:144](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L144)

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

[packages/portalnetwork/src/client/client.ts:739](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L739)

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

[packages/portalnetwork/src/client/client.ts:65](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/client.ts#L65)
