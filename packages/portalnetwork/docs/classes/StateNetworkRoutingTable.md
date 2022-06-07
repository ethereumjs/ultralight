[portalnetwork](../README.md) / [Exports](../modules.md) / StateNetworkRoutingTable

# Class: StateNetworkRoutingTable

## Hierarchy

- `PortalNetworkRoutingTable`

  ↳ **`StateNetworkRoutingTable`**

## Table of contents

### Constructors

- [constructor](StateNetworkRoutingTable.md#constructor)

### Properties

- [ \_emitType](StateNetworkRoutingTable.md# _emittype)
- [ \_emitterType](StateNetworkRoutingTable.md# _emittertype)
- [ \_eventsType](StateNetworkRoutingTable.md# _eventstype)
- [buckets](StateNetworkRoutingTable.md#buckets)
- [localId](StateNetworkRoutingTable.md#localid)

### Accessors

- [size](StateNetworkRoutingTable.md#size)

### Methods

- [addListener](StateNetworkRoutingTable.md#addlistener)
- [clear](StateNetworkRoutingTable.md#clear)
- [contentKeyKnownToPeer](StateNetworkRoutingTable.md#contentkeyknowntopeer)
- [emit](StateNetworkRoutingTable.md#emit)
- [eventNames](StateNetworkRoutingTable.md#eventnames)
- [evictNode](StateNetworkRoutingTable.md#evictnode)
- [getMaxListeners](StateNetworkRoutingTable.md#getmaxlisteners)
- [getRadius](StateNetworkRoutingTable.md#getradius)
- [getValue](StateNetworkRoutingTable.md#getvalue)
- [getWithPending](StateNetworkRoutingTable.md#getwithpending)
- [insertOrUpdate](StateNetworkRoutingTable.md#insertorupdate)
- [isEmpty](StateNetworkRoutingTable.md#isempty)
- [listenerCount](StateNetworkRoutingTable.md#listenercount)
- [listeners](StateNetworkRoutingTable.md#listeners)
- [nearest](StateNetworkRoutingTable.md#nearest)
- [off](StateNetworkRoutingTable.md#off)
- [on](StateNetworkRoutingTable.md#on)
- [once](StateNetworkRoutingTable.md#once)
- [prependListener](StateNetworkRoutingTable.md#prependlistener)
- [prependOnceListener](StateNetworkRoutingTable.md#prependoncelistener)
- [random](StateNetworkRoutingTable.md#random)
- [rawListeners](StateNetworkRoutingTable.md#rawlisteners)
- [rawValues](StateNetworkRoutingTable.md#rawvalues)
- [remove](StateNetworkRoutingTable.md#remove)
- [removeAllListeners](StateNetworkRoutingTable.md#removealllisteners)
- [removeById](StateNetworkRoutingTable.md#removebyid)
- [removeListener](StateNetworkRoutingTable.md#removelistener)
- [setMaxListeners](StateNetworkRoutingTable.md#setmaxlisteners)
- [update](StateNetworkRoutingTable.md#update)
- [updateRadius](StateNetworkRoutingTable.md#updateradius)
- [updateStatus](StateNetworkRoutingTable.md#updatestatus)
- [values](StateNetworkRoutingTable.md#values)
- [valuesOfDistance](StateNetworkRoutingTable.md#valuesofdistance)

## Constructors

### constructor

• **new StateNetworkRoutingTable**(`nodeId`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `nodeId` | `string` |

#### Inherited from

PortalNetworkRoutingTable.constructor

#### Defined in

[packages/portalnetwork/src/client/routingTable.ts:6](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/routingTable.ts#L6)

## Properties

###  \_emitType

• `Optional` ** \_emitType**: `IBucketEvents`

#### Inherited from

PortalNetworkRoutingTable. \_emitType

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:7

___

###  \_emitterType

• `Optional` ** \_emitterType**: `EventEmitter`

#### Inherited from

PortalNetworkRoutingTable. \_emitterType

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:5

___

###  \_eventsType

• `Optional` ** \_eventsType**: `IBucketEvents`

#### Inherited from

PortalNetworkRoutingTable. \_eventsType

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:6

___

### buckets

• **buckets**: `Bucket`[]

#### Inherited from

PortalNetworkRoutingTable.buckets

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:17

___

### localId

• **localId**: `string`

#### Inherited from

PortalNetworkRoutingTable.localId

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:16

## Accessors

### size

• `get` **size**(): `number`

#### Returns

`number`

#### Inherited from

PortalNetworkRoutingTable.size

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:25

## Methods

### addListener

▸ **addListener**<`P`, `T`\>(`this`, `event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IBucketEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | `T` |
| `event` | `P` |
| `listener` | (...`args`: `ListenerType`<`IBucketEvents`[`P`]\>) => `void` |

#### Returns

`T`

#### Inherited from

PortalNetworkRoutingTable.addListener

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

PortalNetworkRoutingTable.addListener

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:18

___

### clear

▸ **clear**(): `void`

#### Returns

`void`

#### Inherited from

PortalNetworkRoutingTable.clear

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:27

___

### contentKeyKnownToPeer

▸ **contentKeyKnownToPeer**(`nodeId`, `contentKey`): `boolean`

Checks to see if a contentKey is known by a peer already

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nodeId` | `string` | `nodeId` of peer content was OFFERed to |
| `contentKey` | `string` | hex prefixed string representation of content key |

#### Returns

`boolean`

boolean indicating if node has already been OFFERed `contentKey` already

#### Inherited from

PortalNetworkRoutingTable.contentKeyKnownToPeer

#### Defined in

[packages/portalnetwork/src/client/routingTable.ts:37](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/routingTable.ts#L37)

___

### emit

▸ **emit**<`P`, `T`\>(`this`, `event`, ...`args`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IBucketEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | `T` |
| `event` | `P` |
| `...args` | `ListenerType`<`IBucketEvents`[`P`]\> |

#### Returns

`T`

#### Inherited from

PortalNetworkRoutingTable.emit

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

PortalNetworkRoutingTable.emit

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:28

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

PortalNetworkRoutingTable.eventNames

#### Defined in

node_modules/@types/node/events.d.ts:642

___

### evictNode

▸ **evictNode**(`nodeId`): `void`

Remove a node from the routing table

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nodeId` | `string` | nodeId of peer to be evicted |

#### Returns

`void`

#### Inherited from

PortalNetworkRoutingTable.evictNode

#### Defined in

[packages/portalnetwork/src/client/routingTable.ts:60](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/routingTable.ts#L60)

___

### getMaxListeners

▸ **getMaxListeners**(): `number`

Returns the current max listener value for the `EventEmitter` which is either
set by `emitter.setMaxListeners(n)` or defaults to {@link defaultMaxListeners}.

**`since`** v1.0.0

#### Returns

`number`

#### Inherited from

PortalNetworkRoutingTable.getMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:499

___

### getRadius

▸ **getRadius**(`nodeId`): `undefined` \| `bigint`

Returns the last recorded radius of a peer with the corresponding `nodeId`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nodeId` | `string` | nodeId of peer for whom radius is sought |

#### Returns

`undefined` \| `bigint`

radius of the peer corresponding to `nodeId`

#### Inherited from

PortalNetworkRoutingTable.getRadius

#### Defined in

[packages/portalnetwork/src/client/routingTable.ts:27](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/routingTable.ts#L27)

___

### getValue

▸ **getValue**(`id`): `undefined` \| [`ENR`](ENR.md)

Gets the ENR if stored, does not include pending values

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`undefined` \| [`ENR`](ENR.md)

#### Inherited from

PortalNetworkRoutingTable.getValue

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:57

___

### getWithPending

▸ **getWithPending**(`id`): `undefined` \| `IEntryFull`<[`ENR`](ENR.md)\>

Gets the IEntryFull if stored, includes pending values

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`undefined` \| `IEntryFull`<[`ENR`](ENR.md)\>

#### Inherited from

PortalNetworkRoutingTable.getWithPending

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:61

___

### insertOrUpdate

▸ **insertOrUpdate**(`value`, `status`): `InsertResult`

Attempts to insert or update

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | [`ENR`](ENR.md) |
| `status` | `EntryStatus` |

#### Returns

`InsertResult`

#### Inherited from

PortalNetworkRoutingTable.insertOrUpdate

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:53

___

### isEmpty

▸ **isEmpty**(): `boolean`

#### Returns

`boolean`

#### Inherited from

PortalNetworkRoutingTable.isEmpty

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:26

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

PortalNetworkRoutingTable.listenerCount

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

PortalNetworkRoutingTable.listeners

#### Defined in

node_modules/@types/node/events.d.ts:512

___

### nearest

▸ **nearest**(`id`, `limit`): [`ENR`](ENR.md)[]

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | id of node to find nearest nodes to |
| `limit` | `number` | maximum number of nodes to return |

#### Returns

[`ENR`](ENR.md)[]

array of `limit` nearest nodes

#### Overrides

PortalNetworkRoutingTable.nearest

#### Defined in

[packages/portalnetwork/src/subprotocols/state/routingTable.ts:12](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/state/routingTable.ts#L12)

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

PortalNetworkRoutingTable.off

#### Defined in

node_modules/@types/node/events.d.ts:472

___

### on

▸ **on**<`P`, `T`\>(`this`, `event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IBucketEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | `T` |
| `event` | `P` |
| `listener` | (...`args`: `ListenerType`<`IBucketEvents`[`P`]\>) => `void` |

#### Returns

`T`

#### Inherited from

PortalNetworkRoutingTable.on

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

PortalNetworkRoutingTable.on

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:16

___

### once

▸ **once**<`P`, `T`\>(`this`, `event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IBucketEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | `T` |
| `event` | `P` |
| `listener` | (...`args`: `ListenerType`<`IBucketEvents`[`P`]\>) => `void` |

#### Returns

`T`

#### Inherited from

PortalNetworkRoutingTable.once

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

PortalNetworkRoutingTable.once

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

PortalNetworkRoutingTable.prependListener

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

PortalNetworkRoutingTable.prependOnceListener

#### Defined in

node_modules/@types/node/events.d.ts:623

___

### random

▸ **random**(): `undefined` \| [`ENR`](ENR.md)

#### Returns

`undefined` \| [`ENR`](ENR.md)

#### Inherited from

PortalNetworkRoutingTable.random

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:66

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

PortalNetworkRoutingTable.rawListeners

#### Defined in

node_modules/@types/node/events.d.ts:542

___

### rawValues

▸ **rawValues**(): `IEntry`<[`ENR`](ENR.md)\>[]

#### Returns

`IEntry`<[`ENR`](ENR.md)\>[]

#### Inherited from

PortalNetworkRoutingTable.rawValues

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:65

___

### remove

▸ **remove**(`value`): `undefined` \| `IEntry`<[`ENR`](ENR.md)\>

Removes a node from the routing table.

Returns the entry if it existed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | [`ENR`](ENR.md) |

#### Returns

`undefined` \| `IEntry`<[`ENR`](ENR.md)\>

#### Inherited from

PortalNetworkRoutingTable.remove

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:39

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

PortalNetworkRoutingTable.removeAllListeners

#### Defined in

node_modules/@types/node/events.d.ts:483

___

### removeById

▸ **removeById**(`id`): `undefined` \| `IEntry`<[`ENR`](ENR.md)\>

Removes a node from the routing table.

Returns the entry if it existed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`undefined` \| `IEntry`<[`ENR`](ENR.md)\>

#### Inherited from

PortalNetworkRoutingTable.removeById

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:33

___

### removeListener

▸ **removeListener**<`P`, `T`\>(`this`, `event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IBucketEvents` |
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

PortalNetworkRoutingTable.removeListener

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

PortalNetworkRoutingTable.removeListener

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:22

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

PortalNetworkRoutingTable.setMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:493

___

### update

▸ **update**(`value`, `status?`): `UpdateResult`

Updates a node's value if it exists in the table.

Optionally the connection state can be modified.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | [`ENR`](ENR.md) |
| `status?` | `EntryStatus` |

#### Returns

`UpdateResult`

#### Inherited from

PortalNetworkRoutingTable.update

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:49

___

### updateRadius

▸ **updateRadius**(`nodeId`, `radius`): `void`

Updates the radius of content a node is interested in

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nodeId` | `string` | id of node on which to update radius |
| `radius` | `bigint` | radius to be set for node |

#### Returns

`void`

#### Inherited from

PortalNetworkRoutingTable.updateRadius

#### Defined in

[packages/portalnetwork/src/client/routingTable.ts:18](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/client/routingTable.ts#L18)

___

### updateStatus

▸ **updateStatus**(`id`, `status`): `UpdateResult`

Updates a node's status if it exists in the table.

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `status` | `EntryStatus` |

#### Returns

`UpdateResult`

#### Inherited from

PortalNetworkRoutingTable.updateStatus

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:43

___

### values

▸ **values**(): [`ENR`](ENR.md)[]

#### Returns

[`ENR`](ENR.md)[]

#### Inherited from

PortalNetworkRoutingTable.values

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:64

___

### valuesOfDistance

▸ **valuesOfDistance**(`value`): [`ENR`](ENR.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `number` |

#### Returns

[`ENR`](ENR.md)[]

#### Inherited from

PortalNetworkRoutingTable.valuesOfDistance

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:63
