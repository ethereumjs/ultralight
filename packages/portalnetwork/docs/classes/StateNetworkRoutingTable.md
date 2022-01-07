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
- [emit](StateNetworkRoutingTable.md#emit)
- [eventNames](StateNetworkRoutingTable.md#eventnames)
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
- [removeFromRadiusMap](StateNetworkRoutingTable.md#removefromradiusmap)
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

[packages/portalnetwork/src/client/routingTable.ts:5](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/routingTable.ts#L5)

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

packages/discv5/lib/kademlia/kademlia.d.ts:17

___

### localId

• **localId**: `string`

#### Inherited from

PortalNetworkRoutingTable.localId

#### Defined in

packages/discv5/lib/kademlia/kademlia.d.ts:16

## Accessors

### size

• `get` **size**(): `number`

#### Returns

`number`

#### Inherited from

PortalNetworkRoutingTable.size

#### Defined in

packages/discv5/lib/kademlia/kademlia.d.ts:25

## Methods

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

packages/discv5/lib/kademlia/kademlia.d.ts:27

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

#### Returns

(`string` \| `symbol`)[]

#### Inherited from

PortalNetworkRoutingTable.eventNames

#### Defined in

node_modules/@types/node/globals.d.ts:655

___

### getMaxListeners

▸ **getMaxListeners**(): `number`

#### Returns

`number`

#### Inherited from

PortalNetworkRoutingTable.getMaxListeners

#### Defined in

node_modules/@types/node/globals.d.ts:647

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

[packages/portalnetwork/src/client/routingTable.ts:34](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/routingTable.ts#L34)

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

PortalNetworkRoutingTable.getValue

#### Defined in

packages/discv5/lib/kademlia/kademlia.d.ts:57

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

PortalNetworkRoutingTable.getWithPending

#### Defined in

packages/discv5/lib/kademlia/kademlia.d.ts:61

___

### insertOrUpdate

▸ **insertOrUpdate**(`value`, `status`): `InsertResult`

Attempts to insert or update

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `ENR` |
| `status` | `EntryStatus` |

#### Returns

`InsertResult`

#### Inherited from

PortalNetworkRoutingTable.insertOrUpdate

#### Defined in

packages/discv5/lib/kademlia/kademlia.d.ts:53

___

### isEmpty

▸ **isEmpty**(): `boolean`

#### Returns

`boolean`

#### Inherited from

PortalNetworkRoutingTable.isEmpty

#### Defined in

packages/discv5/lib/kademlia/kademlia.d.ts:26

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

PortalNetworkRoutingTable.listenerCount

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

PortalNetworkRoutingTable.listeners

#### Defined in

node_modules/@types/node/globals.d.ts:648

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

PortalNetworkRoutingTable.nearest

#### Defined in

[packages/portalnetwork/src/stateSubnetwork/routingTable.ts:12](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/stateSubnetwork/routingTable.ts#L12)

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

PortalNetworkRoutingTable.off

#### Defined in

node_modules/@types/node/globals.d.ts:644

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

▸ **prependListener**(`event`, `listener`): `EventEmitter`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

`EventEmitter`

#### Inherited from

PortalNetworkRoutingTable.prependListener

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

PortalNetworkRoutingTable.prependOnceListener

#### Defined in

node_modules/@types/node/globals.d.ts:654

___

### random

▸ **random**(): `undefined` \| `ENR`

#### Returns

`undefined` \| `ENR`

#### Inherited from

PortalNetworkRoutingTable.random

#### Defined in

packages/discv5/lib/kademlia/kademlia.d.ts:66

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

PortalNetworkRoutingTable.rawListeners

#### Defined in

node_modules/@types/node/globals.d.ts:649

___

### rawValues

▸ **rawValues**(): `IEntry`<`ENR`\>[]

#### Returns

`IEntry`<`ENR`\>[]

#### Inherited from

PortalNetworkRoutingTable.rawValues

#### Defined in

packages/discv5/lib/kademlia/kademlia.d.ts:65

___

### remove

▸ **remove**(`value`): `undefined` \| `IEntry`<`ENR`\>

Removes a node from the routing table.

Returns the entry if it existed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `ENR` |

#### Returns

`undefined` \| `IEntry`<`ENR`\>

#### Inherited from

PortalNetworkRoutingTable.remove

#### Defined in

packages/discv5/lib/kademlia/kademlia.d.ts:39

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

PortalNetworkRoutingTable.removeAllListeners

#### Defined in

node_modules/@types/node/globals.d.ts:645

___

### removeById

▸ **removeById**(`id`): `undefined` \| `IEntry`<`ENR`\>

Removes a node from the routing table.

Returns the entry if it existed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`undefined` \| `IEntry`<`ENR`\>

#### Inherited from

PortalNetworkRoutingTable.removeById

#### Defined in

packages/discv5/lib/kademlia/kademlia.d.ts:33

___

### removeFromRadiusMap

▸ **removeFromRadiusMap**(`nodeId`): `void`

Delete a node from the `radiusMap`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nodeId` | `string` | node to be deleted from radius map |

#### Returns

`void`

#### Inherited from

PortalNetworkRoutingTable.removeFromRadiusMap

#### Defined in

[packages/portalnetwork/src/client/routingTable.ts:25](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/routingTable.ts#L25)

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

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

`EventEmitter`

#### Inherited from

PortalNetworkRoutingTable.setMaxListeners

#### Defined in

node_modules/@types/node/globals.d.ts:646

___

### update

▸ **update**(`value`, `status?`): `UpdateResult`

Updates a node's value if it exists in the table.

Optionally the connection state can be modified.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `ENR` |
| `status?` | `EntryStatus` |

#### Returns

`UpdateResult`

#### Inherited from

PortalNetworkRoutingTable.update

#### Defined in

packages/discv5/lib/kademlia/kademlia.d.ts:49

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

[packages/portalnetwork/src/client/routingTable.ts:16](https://github.com/ethereumjs/ultralight/blob/193f6f0/packages/portalnetwork/src/client/routingTable.ts#L16)

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

packages/discv5/lib/kademlia/kademlia.d.ts:43

___

### values

▸ **values**(): `ENR`[]

#### Returns

`ENR`[]

#### Inherited from

PortalNetworkRoutingTable.values

#### Defined in

packages/discv5/lib/kademlia/kademlia.d.ts:64

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

PortalNetworkRoutingTable.valuesOfDistance

#### Defined in

packages/discv5/lib/kademlia/kademlia.d.ts:63
