[portalnetwork](../README.md) / [Exports](../modules.md) / ENR

# Class: ENR

## Hierarchy

- `Map`<`ENRKey`, `ENRValue`\>

  ↳ **`ENR`**

## Table of contents

### Constructors

- [constructor](ENR.md#constructor)

### Properties

- [[toStringTag]](ENR.md#[tostringtag])
- [\_nodeId](ENR.md#_nodeid)
- [seq](ENR.md#seq)
- [signature](ENR.md#signature)
- [size](ENR.md#size)
- [[species]](ENR.md#[species])

### Accessors

- [id](ENR.md#id)
- [ip](ENR.md#ip)
- [ip6](ENR.md#ip6)
- [keypair](ENR.md#keypair)
- [keypairType](ENR.md#keypairtype)
- [nodeId](ENR.md#nodeid)
- [publicKey](ENR.md#publickey)
- [tcp](ENR.md#tcp)
- [tcp6](ENR.md#tcp6)
- [udp](ENR.md#udp)
- [udp6](ENR.md#udp6)

### Methods

- [[iterator]](ENR.md#[iterator])
- [clear](ENR.md#clear)
- [delete](ENR.md#delete)
- [encode](ENR.md#encode)
- [encodeToValues](ENR.md#encodetovalues)
- [encodeTxt](ENR.md#encodetxt)
- [entries](ENR.md#entries)
- [forEach](ENR.md#foreach)
- [get](ENR.md#get)
- [getFullMultiaddr](ENR.md#getfullmultiaddr)
- [getLocationMultiaddr](ENR.md#getlocationmultiaddr)
- [has](ENR.md#has)
- [keys](ENR.md#keys)
- [peerId](ENR.md#peerid)
- [set](ENR.md#set)
- [setLocationMultiaddr](ENR.md#setlocationmultiaddr)
- [sign](ENR.md#sign)
- [values](ENR.md#values)
- [verify](ENR.md#verify)
- [createFromPeerId](ENR.md#createfrompeerid)
- [createV4](ENR.md#createv4)
- [decode](ENR.md#decode)
- [decodeFromValues](ENR.md#decodefromvalues)
- [decodeTxt](ENR.md#decodetxt)

## Constructors

### constructor

• **new ENR**(`kvs?`, `seq?`, `signature?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `kvs?` | `Record`<`string`, `Uint8Array`\> |
| `seq?` | `bigint` |
| `signature?` | ``null`` \| `Buffer` |

#### Overrides

Map&lt;ENRKey, ENRValue\&gt;.constructor

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:10

## Properties

### [toStringTag]

• `Readonly` **[toStringTag]**: `string`

#### Inherited from

Map.\_\_@toStringTag@197

#### Defined in

node_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts:135

___

### \_nodeId

• `Private` `Optional` **\_nodeId**: `any`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:9

___

### seq

• **seq**: `bigint`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:7

___

### signature

• **signature**: ``null`` \| `Buffer`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:8

___

### size

• `Readonly` **size**: `number`

#### Inherited from

Map.size

#### Defined in

node_modules/typescript/lib/lib.es2015.collection.d.ts:28

___

### [species]

▪ `Static` `Readonly` **[species]**: `MapConstructor`

#### Inherited from

Map.\_\_@species@871

#### Defined in

node_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts:317

## Accessors

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:17

___

### ip

• `get` **ip**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:23

• `set` **ip**(`ip`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `ip` | `undefined` \| `string` |

#### Returns

`void`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:24

___

### ip6

• `get` **ip6**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:29

• `set` **ip6**(`ip`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `ip` | `undefined` \| `string` |

#### Returns

`void`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:30

___

### keypair

• `get` **keypair**(): `IKeypair`

#### Returns

`IKeypair`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:20

___

### keypairType

• `get` **keypairType**(): `KeypairType`

#### Returns

`KeypairType`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:18

___

### nodeId

• `get` **nodeId**(): `string`

#### Returns

`string`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:22

___

### publicKey

• `get` **publicKey**(): `Buffer`

#### Returns

`Buffer`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:19

___

### tcp

• `get` **tcp**(): `undefined` \| `number`

#### Returns

`undefined` \| `number`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:25

• `set` **tcp**(`port`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `port` | `undefined` \| `number` |

#### Returns

`void`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:26

___

### tcp6

• `get` **tcp6**(): `undefined` \| `number`

#### Returns

`undefined` \| `number`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:31

• `set` **tcp6**(`port`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `port` | `undefined` \| `number` |

#### Returns

`void`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:32

___

### udp

• `get` **udp**(): `undefined` \| `number`

#### Returns

`undefined` \| `number`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:27

• `set` **udp**(`port`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `port` | `undefined` \| `number` |

#### Returns

`void`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:28

___

### udp6

• `get` **udp6**(): `undefined` \| `number`

#### Returns

`undefined` \| `number`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:33

• `set` **udp6**(`port`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `port` | `undefined` \| `number` |

#### Returns

`void`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:34

## Methods

### [iterator]

▸ **[iterator]**(): `IterableIterator`<[`string`, `Uint8Array`]\>

Returns an iterable of entries in the map.

#### Returns

`IterableIterator`<[`string`, `Uint8Array`]\>

#### Inherited from

Map.\_\_@iterator@195

#### Defined in

node_modules/typescript/lib/lib.es2015.iterable.d.ts:121

___

### clear

▸ **clear**(): `void`

#### Returns

`void`

#### Inherited from

Map.clear

#### Defined in

node_modules/typescript/lib/lib.es2015.collection.d.ts:22

___

### delete

▸ **delete**(`key`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`boolean`

#### Inherited from

Map.delete

#### Defined in

node_modules/typescript/lib/lib.es2015.collection.d.ts:23

___

### encode

▸ **encode**(`privateKey?`): `Buffer`

#### Parameters

| Name | Type |
| :------ | :------ |
| `privateKey?` | `Buffer` |

#### Returns

`Buffer`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:41

___

### encodeToValues

▸ **encodeToValues**(`privateKey?`): (`string` \| `number` \| `Uint8Array`)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `privateKey?` | `Buffer` |

#### Returns

(`string` \| `number` \| `Uint8Array`)[]

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:40

___

### encodeTxt

▸ **encodeTxt**(`privateKey?`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `privateKey?` | `Buffer` |

#### Returns

`string`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:42

___

### entries

▸ **entries**(): `IterableIterator`<[`string`, `Uint8Array`]\>

Returns an iterable of key, value pairs for every entry in the map.

#### Returns

`IterableIterator`<[`string`, `Uint8Array`]\>

#### Inherited from

Map.entries

#### Defined in

node_modules/typescript/lib/lib.es2015.iterable.d.ts:126

___

### forEach

▸ **forEach**(`callbackfn`, `thisArg?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callbackfn` | (`value`: `Uint8Array`, `key`: `string`, `map`: `Map`<`string`, `Uint8Array`\>) => `void` |
| `thisArg?` | `any` |

#### Returns

`void`

#### Inherited from

Map.forEach

#### Defined in

node_modules/typescript/lib/lib.es2015.collection.d.ts:24

___

### get

▸ **get**(`key`): `undefined` \| `Uint8Array`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`undefined` \| `Uint8Array`

#### Inherited from

Map.get

#### Defined in

node_modules/typescript/lib/lib.es2015.collection.d.ts:25

___

### getFullMultiaddr

▸ **getFullMultiaddr**(`protocol`): `Promise`<`undefined` \| `Multiaddr`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | ``"udp"`` \| ``"udp4"`` \| ``"udp6"`` \| ``"tcp"`` \| ``"tcp4"`` \| ``"tcp6"`` |

#### Returns

`Promise`<`undefined` \| `Multiaddr`\>

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:37

___

### getLocationMultiaddr

▸ **getLocationMultiaddr**(`protocol`): `undefined` \| `Multiaddr`

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocol` | ``"udp"`` \| ``"udp4"`` \| ``"udp6"`` \| ``"tcp"`` \| ``"tcp4"`` \| ``"tcp6"`` |

#### Returns

`undefined` \| `Multiaddr`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:35

___

### has

▸ **has**(`key`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`boolean`

#### Inherited from

Map.has

#### Defined in

node_modules/typescript/lib/lib.es2015.collection.d.ts:26

___

### keys

▸ **keys**(): `IterableIterator`<`string`\>

Returns an iterable of keys in the map

#### Returns

`IterableIterator`<`string`\>

#### Inherited from

Map.keys

#### Defined in

node_modules/typescript/lib/lib.es2015.iterable.d.ts:131

___

### peerId

▸ **peerId**(): `Promise`<`PeerId`\>

#### Returns

`Promise`<`PeerId`\>

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:21

___

### set

▸ **set**(`k`, `v`): [`ENR`](ENR.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `k` | `string` |
| `v` | `Uint8Array` |

#### Returns

[`ENR`](ENR.md)

#### Overrides

Map.set

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:16

___

### setLocationMultiaddr

▸ **setLocationMultiaddr**(`multiaddr`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `multiaddr` | `Multiaddr` |

#### Returns

`void`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:36

___

### sign

▸ **sign**(`data`, `privateKey`): `Buffer`

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `Buffer` |
| `privateKey` | `Buffer` |

#### Returns

`Buffer`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:39

___

### values

▸ **values**(): `IterableIterator`<`Uint8Array`\>

Returns an iterable of values in the map

#### Returns

`IterableIterator`<`Uint8Array`\>

#### Inherited from

Map.values

#### Defined in

node_modules/typescript/lib/lib.es2015.iterable.d.ts:136

___

### verify

▸ **verify**(`data`, `signature`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `Buffer` |
| `signature` | `Buffer` |

#### Returns

`boolean`

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:38

___

### createFromPeerId

▸ `Static` **createFromPeerId**(`peerId`, `kvs?`): [`ENR`](ENR.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `PeerId` |
| `kvs?` | `Record`<`string`, `Uint8Array`\> |

#### Returns

[`ENR`](ENR.md)

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:12

___

### createV4

▸ `Static` **createV4**(`publicKey`, `kvs?`): [`ENR`](ENR.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicKey` | `Buffer` |
| `kvs?` | `Record`<`string`, `Uint8Array`\> |

#### Returns

[`ENR`](ENR.md)

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:11

___

### decode

▸ `Static` **decode**(`encoded`): [`ENR`](ENR.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `encoded` | `Buffer` |

#### Returns

[`ENR`](ENR.md)

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:14

___

### decodeFromValues

▸ `Static` **decodeFromValues**(`decoded`): [`ENR`](ENR.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `decoded` | `Buffer`[] |

#### Returns

[`ENR`](ENR.md)

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:13

___

### decodeTxt

▸ `Static` **decodeTxt**(`encoded`): [`ENR`](ENR.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `encoded` | `string` |

#### Returns

[`ENR`](ENR.md)

#### Defined in

node_modules/@chainsafe/discv5/lib/enr/enr.d.ts:15
