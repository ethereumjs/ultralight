[portalnetwork](../README.md) / [Exports](../modules.md) / WebSocketTransportService

# Class: WebSocketTransportService

This class is responsible for encoding outgoing Packets and decoding incoming Packets over Websockets

## Hierarchy

- `TypeRecord`<`EventEmitter`, `ITransportEvents`, `ITransportEvents`, `this`\> & `Pick`<`EventEmitter`, ``"off"`` \| ``"removeAllListeners"`` \| ``"setMaxListeners"`` \| ``"getMaxListeners"`` \| ``"listeners"`` \| ``"rawListeners"`` \| ``"listenerCount"`` \| ``"prependListener"`` \| ``"prependOnceListener"`` \| ``"eventNames"``\> & `Pick`<`OverriddenMethods`<`EventEmitter`, `ITransportEvents`, `ITransportEvents`\>, ``"on"`` \| ``"addListener"`` \| ``"removeListener"`` \| ``"once"`` \| ``"emit"``\>

  ↳ **`WebSocketTransportService`**

## Implements

- `ITransportService`

## Table of contents

### Constructors

- [constructor](WebSocketTransportService.md#constructor)

### Properties

- [ \_emitType](WebSocketTransportService.md# _emittype)
- [ \_emitterType](WebSocketTransportService.md# _emittertype)
- [ \_eventsType](WebSocketTransportService.md# _eventstype)
- [multiaddr](WebSocketTransportService.md#multiaddr)
- [socket](WebSocketTransportService.md#socket)
- [srcId](WebSocketTransportService.md#srcid)

### Methods

- [addListener](WebSocketTransportService.md#addlistener)
- [emit](WebSocketTransportService.md#emit)
- [eventNames](WebSocketTransportService.md#eventnames)
- [getMaxListeners](WebSocketTransportService.md#getmaxlisteners)
- [handleIncoming](WebSocketTransportService.md#handleincoming)
- [listenerCount](WebSocketTransportService.md#listenercount)
- [listeners](WebSocketTransportService.md#listeners)
- [off](WebSocketTransportService.md#off)
- [on](WebSocketTransportService.md#on)
- [once](WebSocketTransportService.md#once)
- [prependListener](WebSocketTransportService.md#prependlistener)
- [prependOnceListener](WebSocketTransportService.md#prependoncelistener)
- [rawListeners](WebSocketTransportService.md#rawlisteners)
- [removeAllListeners](WebSocketTransportService.md#removealllisteners)
- [removeListener](WebSocketTransportService.md#removelistener)
- [send](WebSocketTransportService.md#send)
- [setMaxListeners](WebSocketTransportService.md#setmaxlisteners)
- [start](WebSocketTransportService.md#start)
- [stop](WebSocketTransportService.md#stop)

## Constructors

### constructor

• **new WebSocketTransportService**(`multiaddr`, `srcId`, `proxyAddress`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `multiaddr` | `Multiaddr` |
| `srcId` | `string` |
| `proxyAddress` | `string` |

#### Overrides

(EventEmitter as { new (): TransportEventEmitter }).constructor

#### Defined in

[packages/portalnetwork/src/transports/websockets.ts:27](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/transports/websockets.ts#L27)

## Properties

###  \_emitType

• `Optional` ** \_emitType**: `ITransportEvents`

#### Implementation of

ITransportService. \_emitType

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }). \_emitType

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:7

___

###  \_emitterType

• `Optional` ** \_emitterType**: `EventEmitter`

#### Implementation of

ITransportService. \_emitterType

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }). \_emitterType

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:5

___

###  \_eventsType

• `Optional` ** \_eventsType**: `ITransportEvents`

#### Implementation of

ITransportService. \_eventsType

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }). \_eventsType

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:6

___

### multiaddr

• **multiaddr**: `Multiaddr`

#### Implementation of

ITransportService.multiaddr

#### Defined in

[packages/portalnetwork/src/transports/websockets.ts:22](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/transports/websockets.ts#L22)

___

### socket

• `Private` **socket**: `WebSocketAsPromised`

#### Defined in

[packages/portalnetwork/src/transports/websockets.ts:24](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/transports/websockets.ts#L24)

___

### srcId

• `Private` **srcId**: `string`

#### Defined in

[packages/portalnetwork/src/transports/websockets.ts:25](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/transports/websockets.ts#L25)

## Methods

### addListener

▸ **addListener**<`P`, `T`\>(`this`, `event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `ITransportEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | `T` |
| `event` | `P` |
| `listener` | (...`args`: `ListenerType`<`ITransportEvents`[`P`]\>) => `void` |

#### Returns

`T`

#### Implementation of

ITransportService.addListener

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).addListener

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

#### Implementation of

ITransportService.addListener

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).addListener

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:18

___

### emit

▸ **emit**<`P`, `T`\>(`this`, `event`, ...`args`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `ITransportEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | `T` |
| `event` | `P` |
| `...args` | `ListenerType`<`ITransportEvents`[`P`]\> |

#### Returns

`T`

#### Implementation of

ITransportService.emit

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).emit

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

#### Implementation of

ITransportService.emit

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).emit

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

#### Implementation of

ITransportService.eventNames

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).eventNames

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

#### Implementation of

ITransportService.getMaxListeners

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).getMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:499

___

### handleIncoming

▸ **handleIncoming**(`data`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `Uint8Array` |

#### Returns

`void`

#### Defined in

[packages/portalnetwork/src/transports/websockets.ts:69](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/transports/websockets.ts#L69)

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

#### Implementation of

ITransportService.listenerCount

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).listenerCount

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

#### Implementation of

ITransportService.listeners

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).listeners

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

#### Implementation of

ITransportService.off

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).off

#### Defined in

node_modules/@types/node/events.d.ts:472

___

### on

▸ **on**<`P`, `T`\>(`this`, `event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `ITransportEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | `T` |
| `event` | `P` |
| `listener` | (...`args`: `ListenerType`<`ITransportEvents`[`P`]\>) => `void` |

#### Returns

`T`

#### Implementation of

ITransportService.on

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).on

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

#### Implementation of

ITransportService.on

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).on

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:16

___

### once

▸ **once**<`P`, `T`\>(`this`, `event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `ITransportEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | `T` |
| `event` | `P` |
| `listener` | (...`args`: `ListenerType`<`ITransportEvents`[`P`]\>) => `void` |

#### Returns

`T`

#### Implementation of

ITransportService.once

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).once

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

#### Implementation of

ITransportService.once

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).once

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

#### Implementation of

ITransportService.prependListener

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).prependListener

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

#### Implementation of

ITransportService.prependOnceListener

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).prependOnceListener

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

#### Implementation of

ITransportService.rawListeners

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).rawListeners

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

#### Implementation of

ITransportService.removeAllListeners

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).removeAllListeners

#### Defined in

node_modules/@types/node/events.d.ts:483

___

### removeListener

▸ **removeListener**<`P`, `T`\>(`this`, `event`, `listener`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends keyof `ITransportEvents` |
| `T` | `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | `T` |
| `event` | `P` |
| `listener` | (...`args`: `any`[]) => `any` |

#### Returns

`T`

#### Implementation of

ITransportService.removeListener

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).removeListener

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

#### Implementation of

ITransportService.removeListener

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).removeListener

#### Defined in

node_modules/strict-event-emitter-types/types/src/index.d.ts:22

___

### send

▸ **send**(`to`, `toId`, `packet`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `to` | `Multiaddr` |
| `toId` | `string` |
| `packet` | `IPacket` |

#### Returns

`Promise`<`void`\>

#### Implementation of

ITransportService.send

#### Defined in

[packages/portalnetwork/src/transports/websockets.ts:55](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/transports/websockets.ts#L55)

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

#### Implementation of

ITransportService.setMaxListeners

#### Inherited from

(EventEmitter as { new (): TransportEventEmitter }).setMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:493

___

### start

▸ **start**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ITransportService.start

#### Defined in

[packages/portalnetwork/src/transports/websockets.ts:41](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/transports/websockets.ts#L41)

___

### stop

▸ **stop**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ITransportService.stop

#### Defined in

[packages/portalnetwork/src/transports/websockets.ts:51](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/transports/websockets.ts#L51)
