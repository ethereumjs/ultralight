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
- [bootnodes](PortalNetwork.md#bootnodes)
- [db](PortalNetwork.md#db)
- [discv5](PortalNetwork.md#discv5)
- [logger](PortalNetwork.md#logger)
- [metrics](PortalNetwork.md#metrics)
- [peerId](PortalNetwork.md#peerid)
- [protocols](PortalNetwork.md#protocols)
- [refreshListeners](PortalNetwork.md#refreshlisteners)
- [supportsRendezvous](PortalNetwork.md#supportsrendezvous)
- [uTP](PortalNetwork.md#utp)
- [unverifiedSessionCache](PortalNetwork.md#unverifiedsessioncache)

### Methods

- [addListener](PortalNetwork.md#addlistener)
- [emit](PortalNetwork.md#emit)
- [enableLog](PortalNetwork.md#enablelog)
- [eventNames](PortalNetwork.md#eventnames)
- [getMaxListeners](PortalNetwork.md#getmaxlisteners)
- [handleRendezvous](PortalNetwork.md#handlerendezvous)
- [handleUTP](PortalNetwork.md#handleutp)
- [listenerCount](PortalNetwork.md#listenercount)
- [listeners](PortalNetwork.md#listeners)
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
- [sendPortalNetworkMessage](PortalNetwork.md#sendportalnetworkmessage)
- [sendPortalNetworkResponse](PortalNetwork.md#sendportalnetworkresponse)
- [sendRendezvous](PortalNetwork.md#sendrendezvous)
- [setMaxListeners](PortalNetwork.md#setmaxlisteners)
- [start](PortalNetwork.md#start)
- [stop](PortalNetwork.md#stop)
- [storeNodeDetails](PortalNetwork.md#storenodedetails)
- [create](PortalNetwork.md#create)

## Constructors

### constructor

• **new PortalNetwork**(`opts`)

Portal Network constructor

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts` | `PortalNetworkOpts` | a dictionary of `PortalNetworkOpts` |

#### Overrides

(EventEmitter as { new (): PortalNetworkEventEmitter }).constructor

#### Defined in

[packages/portalnetwork/src/client/client.ts:133](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L133)

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

### bootnodes

• **bootnodes**: `string`[]

#### Defined in

[packages/portalnetwork/src/client/client.ts:38](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L38)

___

### db

• **db**: `DBManager`

#### Defined in

[packages/portalnetwork/src/client/client.ts:37](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L37)

___

### discv5

• **discv5**: `Discv5`

#### Defined in

[packages/portalnetwork/src/client/client.ts:34](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L34)

___

### logger

• **logger**: `Debugger`

#### Defined in

[packages/portalnetwork/src/client/client.ts:40](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L40)

___

### metrics

• **metrics**: `undefined` \| `PortalNetworkMetrics`

#### Defined in

[packages/portalnetwork/src/client/client.ts:39](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L39)

___

### peerId

• `Private` **peerId**: `PeerId`

#### Defined in

[packages/portalnetwork/src/client/client.ts:42](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L42)

___

### protocols

• **protocols**: `Map`<[`ProtocolId`](../enums/ProtocolId.md), `BaseProtocol`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:35](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L35)

___

### refreshListeners

• `Private` **refreshListeners**: `Map`<[`ProtocolId`](../enums/ProtocolId.md), `Timer`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:41](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L41)

___

### supportsRendezvous

• `Private` **supportsRendezvous**: `boolean`

#### Defined in

[packages/portalnetwork/src/client/client.ts:43](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L43)

___

### uTP

• **uTP**: `PortalNetworkUTP`

#### Defined in

[packages/portalnetwork/src/client/client.ts:36](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L36)

___

### unverifiedSessionCache

• `Private` **unverifiedSessionCache**: `LRUCache`<`string`, `Multiaddr`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:44](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L44)

## Methods

### addListener

▸ **addListener**<`P`, `T`\>(`this`, `event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IPortalNetworkEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | `T` |
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

### emit

▸ **emit**<`P`, `T`\>(`this`, `event`, ...`args`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IPortalNetworkEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | `T` |
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
| `namespaces` | `string` | `'*portalnetwork*,*discv5:service*,*uTP*'` | comma separated list of logging namespaces defaults to "portalnetwork*, discv5:service, <uTP>*" |

#### Returns

`void`

#### Defined in

[packages/portalnetwork/src/client/client.ts:238](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L238)

___

### eventNames

▸ **eventNames**(): (`string` \| `symbol`)[]

Returns an array listing the events for which the emitter has registered
listeners. The values in the array are strings or `Symbol`s.

```js
const EventEmitter = require('events');
const myEE = new EventEmitter();
myEE.on('foo', () => {});
myEE.on('bar', () => {});

const sym = Symbol('symbol');
myEE.on(sym, () => {});

console.log(myEE.eventNames());
// Prints: [ 'foo', 'bar', Symbol(symbol) ]
```

**`since`** v6.0.0

#### Returns

(`string` \| `symbol`)[]

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).eventNames

#### Defined in

node_modules/@types/node/events.d.ts:642

___

### getMaxListeners

▸ **getMaxListeners**(): `number`

Returns the current max listener value for the `EventEmitter` which is either
set by `emitter.setMaxListeners(n)` or defaults to {@link defaultMaxListeners}.

**`since`** v1.0.0

#### Returns

`number`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).getMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:499

___

### handleRendezvous

▸ `Private` **handleRendezvous**(`src`, `srcId`, `message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `src` | `INodeAddress` |
| `srcId` | `string` |
| `message` | `ITalkReqMessage` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:340](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L340)

___

### handleUTP

▸ `Private` **handleUTP**(`src`, `srcId`, `msg`, `packetBuffer`): `Promise`<`void`\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `src` | `INodeAddress` | - |
| `srcId` | `string` | nodeID that uTP packet originates from |
| `msg` | `ITalkReqMessage` | - |
| `packetBuffer` | `Buffer` | uTP packet encoded to Buffer |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:298](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L298)

___

### listenerCount

▸ **listenerCount**(`eventName`): `number`

Returns the number of listeners listening to the event named `eventName`.

**`since`** v3.2.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` \| `symbol` | The name of the event being listened for |

#### Returns

`number`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).listenerCount

#### Defined in

node_modules/@types/node/events.d.ts:589

___

### listeners

▸ **listeners**(`eventName`): `Function`[]

Returns a copy of the array of listeners for the event named `eventName`.

```js
server.on('connection', (stream) => {
  console.log('someone connected!');
});
console.log(util.inspect(server.listeners('connection')));
// Prints: [ [Function] ]
```

**`since`** v0.1.26

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `symbol` |

#### Returns

`Function`[]

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).listeners

#### Defined in

node_modules/@types/node/events.d.ts:512

___

### off

▸ **off**(`eventName`, `listener`): `EventEmitter`

Alias for `emitter.removeListener()`.

**`since`** v10.0.0

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

`EventEmitter`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).off

#### Defined in

node_modules/@types/node/events.d.ts:472

___

### on

▸ **on**<`P`, `T`\>(`this`, `event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IPortalNetworkEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | `T` |
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
| `sourceId` | ``null`` \| [`ENR`](ENR.md) |
| `message` | `ITalkReqMessage` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:269](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L269)

___

### onTalkResp

▸ `Private` **onTalkResp**(`src`, `sourceId`, `message`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `src` | `INodeAddress` |
| `sourceId` | ``null`` \| [`ENR`](ENR.md) |
| `message` | `ITalkRespMessage` |

#### Returns

`void`

#### Defined in

[packages/portalnetwork/src/client/client.ts:286](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L286)

___

### once

▸ **once**<`P`, `T`\>(`this`, `event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IPortalNetworkEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | `T` |
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

▸ **prependListener**(`eventName`, `listener`): `EventEmitter`

Adds the `listener` function to the _beginning_ of the listeners array for the
event named `eventName`. No checks are made to see if the `listener` has
already been added. Multiple calls passing the same combination of `eventName`and `listener` will result in the `listener` being added, and called, multiple
times.

```js
server.prependListener('connection', (stream) => {
  console.log('someone connected!');
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

**`since`** v6.0.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` \| `symbol` | The name of the event. |
| `listener` | (...`args`: `any`[]) => `void` | The callback function |

#### Returns

`EventEmitter`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).prependListener

#### Defined in

node_modules/@types/node/events.d.ts:607

___

### prependOnceListener

▸ **prependOnceListener**(`eventName`, `listener`): `EventEmitter`

Adds a **one-time**`listener` function for the event named `eventName` to the_beginning_ of the listeners array. The next time `eventName` is triggered, this
listener is removed, and then invoked.

```js
server.prependOnceListener('connection', (stream) => {
  console.log('Ah, we have our first user!');
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

**`since`** v6.0.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` \| `symbol` | The name of the event. |
| `listener` | (...`args`: `any`[]) => `void` | The callback function |

#### Returns

`EventEmitter`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).prependOnceListener

#### Defined in

node_modules/@types/node/events.d.ts:623

___

### rawListeners

▸ **rawListeners**(`eventName`): `Function`[]

Returns a copy of the array of listeners for the event named `eventName`,
including any wrappers (such as those created by `.once()`).

```js
const emitter = new EventEmitter();
emitter.once('log', () => console.log('log once'));

// Returns a new Array with a function `onceWrapper` which has a property
// `listener` which contains the original listener bound above
const listeners = emitter.rawListeners('log');
const logFnWrapper = listeners[0];

// Logs "log once" to the console and does not unbind the `once` event
logFnWrapper.listener();

// Logs "log once" to the console and removes the listener
logFnWrapper();

emitter.on('log', () => console.log('log persistently'));
// Will return a new Array with a single function bound by `.on()` above
const newListeners = emitter.rawListeners('log');

// Logs "log persistently" twice
newListeners[0]();
emitter.emit('log');
```

**`since`** v9.4.0

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `symbol` |

#### Returns

`Function`[]

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).rawListeners

#### Defined in

node_modules/@types/node/events.d.ts:542

___

### removeAllListeners

▸ **removeAllListeners**(`event?`): `EventEmitter`

Removes all listeners, or those of the specified `eventName`.

It is bad practice to remove listeners added elsewhere in the code,
particularly when the `EventEmitter` instance was created by some other
component or module (e.g. sockets or file streams).

Returns a reference to the `EventEmitter`, so that calls can be chained.

**`since`** v0.1.26

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `string` \| `symbol` |

#### Returns

`EventEmitter`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).removeAllListeners

#### Defined in

node_modules/@types/node/events.d.ts:483

___

### removeListener

▸ **removeListener**<`P`, `T`\>(`this`, `event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IPortalNetworkEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | `T` |
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

### sendPortalNetworkMessage

▸ **sendPortalNetworkMessage**(`enr`, `payload`, `protocolId`, `utpMessage?`): `Promise`<`Buffer`\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `enr` | [`ENR`](ENR.md) | - |
| `payload` | `Buffer` | `Buffer` serialized payload of message |
| `protocolId` | [`ProtocolId`](../enums/ProtocolId.md) | subprotocol ID of subprotocol message is being sent on |
| `utpMessage?` | `boolean` | - |

#### Returns

`Promise`<`Buffer`\>

response from `dstId` as `Buffer` or null `Buffer`

#### Defined in

[packages/portalnetwork/src/client/client.ts:422](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L422)

___

### sendPortalNetworkResponse

▸ **sendPortalNetworkResponse**(`src`, `requestId`, `payload`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `src` | `INodeAddress` |
| `requestId` | `bigint` |
| `payload` | `Uint8Array` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:444](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L444)

___

### sendRendezvous

▸ **sendRendezvous**(`dstId`, `rendezvousNode`, `protocolId`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `dstId` | `string` |
| `rendezvousNode` | `string` |
| `protocolId` | [`ProtocolId`](../enums/ProtocolId.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:308](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L308)

___

### setMaxListeners

▸ **setMaxListeners**(`n`): `EventEmitter`

By default `EventEmitter`s will print a warning if more than `10` listeners are
added for a particular event. This is a useful default that helps finding
memory leaks. The `emitter.setMaxListeners()` method allows the limit to be
modified for this specific `EventEmitter` instance. The value can be set to`Infinity` (or `0`) to indicate an unlimited number of listeners.

Returns a reference to the `EventEmitter`, so that calls can be chained.

**`since`** v0.3.5

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

`EventEmitter`

#### Inherited from

(EventEmitter as { new (): PortalNetworkEventEmitter }).setMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:493

___

### start

▸ **start**(): `Promise`<`void`\>

Starts the portal network client

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:208](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L208)

___

### stop

▸ **stop**(): `Promise`<`void`\>

Stops the portal network client and cleans up listeners

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:225](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L225)

___

### storeNodeDetails

▸ **storeNodeDetails**(): `Promise`<`void`\>

Store node details in DB for node restart

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:245](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L245)

___

### create

▸ `Static` **create**(`opts`): `Promise`<[`PortalNetwork`](PortalNetwork.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Partial`<`PortalNetworkOpts`\> |

#### Returns

`Promise`<[`PortalNetwork`](PortalNetwork.md)\>

#### Defined in

[packages/portalnetwork/src/client/client.ts:46](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/client.ts#L46)
