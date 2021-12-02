[portalnetwork](../README.md) / [Exports](../modules.md) / StateNetworkRoutingTable

# Class: StateNetworkRoutingTable

## Hierarchy

- `KademliaRoutingTable`

  ↳ **`StateNetworkRoutingTable`**

## Table of contents

### Constructors

- [constructor](StateNetworkRoutingTable.md#constructor)

### Properties

- [ \_emitType](StateNetworkRoutingTable.md# _emittype)
- [ \_emitterType](StateNetworkRoutingTable.md# _emittertype)
- [ \_eventsType](StateNetworkRoutingTable.md# _eventstype)
- [buckets](StateNetworkRoutingTable.md#buckets)
- [k](StateNetworkRoutingTable.md#k)
- [localId](StateNetworkRoutingTable.md#localid)
- [size](StateNetworkRoutingTable.md#size)

### Methods

- [add](StateNetworkRoutingTable.md#add)
- [addListener](StateNetworkRoutingTable.md#addlistener)
- [clear](StateNetworkRoutingTable.md#clear)
- [emit](StateNetworkRoutingTable.md#emit)
- [eventNames](StateNetworkRoutingTable.md#eventnames)
- [getMaxListeners](StateNetworkRoutingTable.md#getmaxlisteners)
- [getValue](StateNetworkRoutingTable.md#getvalue)
- [getWithPending](StateNetworkRoutingTable.md#getwithpending)
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
- [remove](StateNetworkRoutingTable.md#remove)
- [removeAllListeners](StateNetworkRoutingTable.md#removealllisteners)
- [removeById](StateNetworkRoutingTable.md#removebyid)
- [removeListener](StateNetworkRoutingTable.md#removelistener)
- [setMaxListeners](StateNetworkRoutingTable.md#setmaxlisteners)
- [update](StateNetworkRoutingTable.md#update)
- [updateStatus](StateNetworkRoutingTable.md#updatestatus)
- [updateValue](StateNetworkRoutingTable.md#updatevalue)
- [values](StateNetworkRoutingTable.md#values)
- [valuesOfDistance](StateNetworkRoutingTable.md#valuesofdistance)

## Constructors

### constructor

• **new StateNetworkRoutingTable**(`localId`, `k`)

Create a new routing table.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `localId` | `string` | the ID of the local node |
| `k` | `number` | the size of each bucket (k value) |

#### Inherited from

KademliaRoutingTable.constructor

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:25

## Properties

###  \_emitType

• `Optional` ** \_emitType**: `IBucketEvents`

#### Inherited from

KademliaRoutingTable. \_emitType

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:7

___

###  \_emitterType

• `Optional` ** \_emitterType**: `EventEmitter`

#### Inherited from

KademliaRoutingTable. \_emitterType

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:5

___

###  \_eventsType

• `Optional` ** \_eventsType**: `IBucketEvents`

#### Inherited from

KademliaRoutingTable. \_eventsType

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:6

___

### buckets

• **buckets**: `Bucket`[]

#### Inherited from

KademliaRoutingTable.buckets

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:18

___

### k

• **k**: `number`

#### Inherited from

KademliaRoutingTable.k

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:16

___

### localId

• **localId**: `string`

#### Inherited from

KademliaRoutingTable.localId

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:15

___

### size

• **size**: `number`

#### Inherited from

KademliaRoutingTable.size

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:17

## Methods

### add

▸ **add**(`value`, `status?`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `ENR` |
| `status?` | `EntryStatus` |

#### Returns

`boolean`

#### Inherited from

KademliaRoutingTable.add

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:27

___

### addListener

▸ **addListener**<`P`, `T`\>(`event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IBucketEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `P` |
| `listener` | (...`args`: `ListenerType`<`IBucketEvents`[`P`]\>) => `void` |

#### Returns

`T`

#### Inherited from

KademliaRoutingTable.addListener

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

KademliaRoutingTable.addListener

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:18

___

### clear

▸ **clear**(): `void`

#### Returns

`void`

#### Inherited from

KademliaRoutingTable.clear

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:28

___

### emit

▸ **emit**<`P`, `T`\>(`event`, ...`args`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IBucketEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `P` |
| `...args` | `ListenerType`<`IBucketEvents`[`P`]\> |

#### Returns

`T`

#### Inherited from

KademliaRoutingTable.emit

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

KademliaRoutingTable.emit

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

KademliaRoutingTable.eventNames

#### Defined in

node_modules/@types/node/events.d.ts:614

___

### getMaxListeners

▸ **getMaxListeners**(): `number`

Returns the current max listener value for the `EventEmitter` which is either
set by `emitter.setMaxListeners(n)` or defaults to [defaultMaxListeners](PortalNetwork.md#defaultmaxlisteners).

**`since`** v1.0.0

#### Returns

`number`

#### Inherited from

KademliaRoutingTable.getMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:471

___

### getValue

▸ **getValue**(`id`): `undefined` \| `ENR`

Gets the ENR if stored, does not include pending values

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`undefined` \| `ENR`

#### Inherited from

KademliaRoutingTable.getValue

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:37

___

### getWithPending

▸ **getWithPending**(`id`): `undefined` \| `IEntryFull`<`ENR`\>

Gets the IEntryFull if stored, includes pending values

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`undefined` \| `IEntryFull`<`ENR`\>

#### Inherited from

KademliaRoutingTable.getWithPending

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:41

___

### isEmpty

▸ **isEmpty**(): `boolean`

#### Returns

`boolean`

#### Inherited from

KademliaRoutingTable.isEmpty

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

KademliaRoutingTable.listenerCount

#### Defined in

node_modules/@types/node/events.d.ts:561

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

KademliaRoutingTable.listeners

#### Defined in

node_modules/@types/node/events.d.ts:484

___

### nearest

▸ **nearest**(`id`, `limit`): `ENR`[]

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | id of node to find nearest nodes to |
| `limit` | `number` | maximum number of nodes to return |

#### Returns

`ENR`[]

array of `limit` nearest nodes

#### Overrides

KademliaRoutingTable.nearest

#### Defined in

[src/dht/dht.ts:13](https://github.com/ethereumjs/portalnetwork/blob/52c3050/src/dht/dht.ts#L13)

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

KademliaRoutingTable.off

#### Defined in

node_modules/@types/node/events.d.ts:444

___

### on

▸ **on**<`P`, `T`\>(`event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IBucketEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `P` |
| `listener` | (...`args`: `ListenerType`<`IBucketEvents`[`P`]\>) => `void` |

#### Returns

`T`

#### Inherited from

KademliaRoutingTable.on

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

KademliaRoutingTable.on

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:16

___

### once

▸ **once**<`P`, `T`\>(`event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IBucketEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `P` |
| `listener` | (...`args`: `ListenerType`<`IBucketEvents`[`P`]\>) => `void` |

#### Returns

`T`

#### Inherited from

KademliaRoutingTable.once

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

KademliaRoutingTable.once

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

KademliaRoutingTable.prependListener

#### Defined in

node_modules/@types/node/events.d.ts:579

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

KademliaRoutingTable.prependOnceListener

#### Defined in

node_modules/@types/node/events.d.ts:595

___

### random

▸ **random**(): `undefined` \| `ENR`

#### Returns

`undefined` \| `ENR`

#### Inherited from

KademliaRoutingTable.random

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:45

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

KademliaRoutingTable.rawListeners

#### Defined in

node_modules/@types/node/events.d.ts:514

___

### remove

▸ **remove**(`value`): `undefined` \| `ENR`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `ENR` |

#### Returns

`undefined` \| `ENR`

#### Inherited from

KademliaRoutingTable.remove

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:30

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

KademliaRoutingTable.removeAllListeners

#### Defined in

node_modules/@types/node/events.d.ts:455

___

### removeById

▸ **removeById**(`id`): `undefined` \| `ENR`

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`undefined` \| `ENR`

#### Inherited from

KademliaRoutingTable.removeById

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:29

___

### removeListener

▸ **removeListener**<`P`, `T`\>(`event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `IBucketEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `P` |
| `listener` | (...`args`: `any`[]) => `any` |

#### Returns

`T`

#### Inherited from

KademliaRoutingTable.removeListener

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

KademliaRoutingTable.removeListener

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

KademliaRoutingTable.setMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:465

___

### update

▸ **update**(`value`, `status`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `ENR` |
| `status` | `EntryStatus` |

#### Returns

`boolean`

#### Inherited from

KademliaRoutingTable.update

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:33

___

### updateStatus

▸ **updateStatus**(`id`, `status`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `status` | `EntryStatus` |

#### Returns

`boolean`

#### Inherited from

KademliaRoutingTable.updateStatus

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:32

___

### updateValue

▸ **updateValue**(`value`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `ENR` |

#### Returns

`boolean`

#### Inherited from

KademliaRoutingTable.updateValue

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:31

___

### values

▸ **values**(): `ENR`[]

#### Returns

`ENR`[]

#### Inherited from

KademliaRoutingTable.values

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:44

___

### valuesOfDistance

▸ **valuesOfDistance**(`value`): `ENR`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `number` |

#### Returns

`ENR`[]

#### Inherited from

KademliaRoutingTable.valuesOfDistance

#### Defined in

node_modules/@chainsafe/discv5/lib/kademlia/kademlia.d.ts:43
