[portalnetwork](../README.md) / [Exports](../modules.md) / HeaderAccumulator

# Class: HeaderAccumulator

## Table of contents

### Constructors

- [constructor](HeaderAccumulator.md#constructor)

### Properties

- [\_currentEpoch](HeaderAccumulator.md#_currentepoch)
- [\_historicalEpochs](HeaderAccumulator.md#_historicalepochs)

### Accessors

- [currentEpoch](HeaderAccumulator.md#currentepoch)
- [historicalEpochs](HeaderAccumulator.md#historicalepochs)

### Methods

- [currentHeight](HeaderAccumulator.md#currentheight)
- [updateAccumulator](HeaderAccumulator.md#updateaccumulator)
- [verifyInclusionProof](HeaderAccumulator.md#verifyinclusionproof)

## Constructors

### constructor

• **new HeaderAccumulator**(`initFromGenesis?`)

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `initFromGenesis` | `boolean` | `false` | boolean indicating whether to initialize the accumulator with the mainnet genesis block |

#### Defined in

[packages/portalnetwork/src/subprotocols/headerGossip/headerAccumulator.ts:14](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/headerGossip/headerAccumulator.ts#L14)

## Properties

### \_currentEpoch

• `Private` **\_currentEpoch**: [`HeaderRecordType`](../modules.md#headerrecordtype)[]

#### Defined in

[packages/portalnetwork/src/subprotocols/headerGossip/headerAccumulator.ts:7](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/headerGossip/headerAccumulator.ts#L7)

___

### \_historicalEpochs

• `Private` **\_historicalEpochs**: `Uint8Array`[]

#### Defined in

[packages/portalnetwork/src/subprotocols/headerGossip/headerAccumulator.ts:8](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/headerGossip/headerAccumulator.ts#L8)

## Accessors

### currentEpoch

• `get` **currentEpoch**(): [`HeaderRecordType`](../modules.md#headerrecordtype)[]

#### Returns

[`HeaderRecordType`](../modules.md#headerrecordtype)[]

#### Defined in

[packages/portalnetwork/src/subprotocols/headerGossip/headerAccumulator.ts:27](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/headerGossip/headerAccumulator.ts#L27)

___

### historicalEpochs

• `get` **historicalEpochs**(): `Uint8Array`[]

#### Returns

`Uint8Array`[]

#### Defined in

[packages/portalnetwork/src/subprotocols/headerGossip/headerAccumulator.ts:31](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/headerGossip/headerAccumulator.ts#L31)

## Methods

### currentHeight

▸ **currentHeight**(): `number`

Returns the current height of the chain contained in the accumulator.  Assumes first block is genesis
so subtracts one from chain height since genesis block height is technically 0.

#### Returns

`number`

#### Defined in

[packages/portalnetwork/src/subprotocols/headerGossip/headerAccumulator.ts:84](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/headerGossip/headerAccumulator.ts#L84)

___

### updateAccumulator

▸ **updateAccumulator**(`newHeader`): `void`

Adds a new block header to the `currentEpoch` in the header accumulator

#### Parameters

| Name | Type |
| :------ | :------ |
| `newHeader` | `BlockHeader` |

#### Returns

`void`

#### Defined in

[packages/portalnetwork/src/subprotocols/headerGossip/headerAccumulator.ts:38](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/headerGossip/headerAccumulator.ts#L38)

___

### verifyInclusionProof

▸ **verifyInclusionProof**(`proof`, `header`, `blockPosition`): `boolean`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `proof` | `Proof` | a `Proof` for a particular header's inclusion in the accumulator's `currentEpoch` |
| `header` | `BlockHeader` | the blockheader being proved to be included in the `currentEpoch` |
| `blockPosition` | `number` | the index in the array of `HeaderRecord`s of the header in the `currentEpoch` |

#### Returns

`boolean`

true if proof is valid, false otherwise

#### Defined in

[packages/portalnetwork/src/subprotocols/headerGossip/headerAccumulator.ts:63](https://github.com/ethereumjs/ultralight/blob/9f385ce/packages/portalnetwork/src/subprotocols/headerGossip/headerAccumulator.ts#L63)
