import { distance } from '@chainsafe/discv5'
import { randomBytes } from '@ethereumjs/util'
import { assert, describe, it } from 'vitest'

import { StateNetworkContentType } from '../../../src/networks/state/types.js'
import { calculateAddressRange, keyType } from '../../../src/networks/state/util.js'

describe('distance()', () => {
  it('should calculate distance between two values', () => {
    assert.equal(distance('00', '08'), 8n, 'calculates correct distance')
    assert.equal(distance('00', '09'), 9n, 'calculates correct distance')
    assert.equal(distance('00', '0a'), 10n, 'calculates correct distance')
    assert.equal(distance('01', '0a'), 11n, 'calculates correct distance')
    assert.equal(distance('02', '0a'), 8n, 'calculates correct distance')
    assert.equal(distance('03', '0a'), 9n, 'calculates correct distance')
    assert.equal(distance('0a', '00'), 10n, 'calculates correct distance')
    assert.equal(distance('0a', '01'), 11n, 'calculates correct distance')
    assert.equal(distance('0a', '0a'), 0n, 'calculates correct distance')
  })
})

describe('keyType', () => {
  const randHash = randomBytes(32)
  it('should indentify AccountTrieProof contentKey', () => {
    const contentKey = Uint8Array.from([0x10, ...randHash])
    const type = keyType(contentKey)
    assert.equal(type, StateNetworkContentType.AccountTrieNode)
  })
  it('should indentify ContractStorageTrieProof contentKey', () => {
    const contentKey = Uint8Array.from([0x11, ...randHash])
    const type = keyType(contentKey)
    assert.equal(type, StateNetworkContentType.ContractTrieNode)
  })
  it('should indentify ContractByteCode contentKey', () => {
    const contentKey = Uint8Array.from([0x12, ...randHash])
    const type = keyType(contentKey)
    assert.equal(type, StateNetworkContentType.ContractByteCode)
  })
})

const halfRange = (min: bigint, max: bigint, change: 'min' | 'max' = 'max') => {
  if (change === 'max') {
    const newMin = min
    const newMax = min + (max - min) / 2n
    return [newMin, newMax]
  } else {
    const newMin = max - (max - min) / 2n
    const newMax = max
    return [newMin, newMax]
  }
}

const address = '0x0ac1df79da5c2fa964d224f2545b2cba509d6d76c001a26f6fe3d49ae7dbca19'
describe('calculateAddressRange: ' + address.slice(0, 18) + '...', () => {
  //                              0x
  //               0 1 2 3 4 5 6 7  8 9 a b c d e f
  //              /                                 \
  //     [0x00...]                                   [0x0ff...]
  const [min, max] = [2n ** 0n, 2n ** 256n]

  it('should calculate address range for radius = 2**256 - 1', () => {
    const range = calculateAddressRange(BigInt(address), 2n ** 256n - 1n)
    assert.equal(range.min, min - 1n)
    assert.equal(range.max, max - 1n)
    assert.deepEqual(range, {
      min: BigInt('0x0000000000000000000000000000000000000000000000000000000000000000'),
      max: BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
    })
  })

  const [min0, max0] = halfRange(min, max)
  it('should calculate address range for radius = 2**255 - 1', () => {
    //                              0x
    //               0 1 2 3 4 5 6 7  - - - - - - - -
    //              /               \
    //   [0x0000...]                 [0x7fff...]
    const range = calculateAddressRange(BigInt(address), 2n ** 255n - 1n)
    assert.equal(range.min, min0 - 1n)
    assert.equal(range.max, max0 - 1n)
    assert.deepEqual(range, {
      min: BigInt('0x0000000000000000000000000000000000000000000000000000000000000000'),
      max: BigInt('0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
    })
  })

  const [min_0, max_0] = halfRange(min0, max0)
  it('should calculate address range for radius = 2**254 - 1', () => {
    //                              0x
    //               0 1 2 3 - - - -  _ _ _ _ _ _ _ _
    //              /       \
    //   [0x0000...]         [0x3fff...]
    const range = calculateAddressRange(BigInt(address), 2n ** 254n - 1n)
    assert.equal(range.min, min_0 - 1n)
    assert.equal(range.max, max_0 - 1n)
    assert.deepEqual(range, {
      min: BigInt('0x0000000000000000000000000000000000000000000000000000000000000000'),
      max: BigInt('0x3fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
    })
  })

  const [min__0, max__0] = halfRange(min_0, max_0)
  it('should calculate address range for radius = 2**253 - 1', () => {
    //                              0x
    //               0 1 - - _ _ _ _  _ _ _ _ _ _ _ _
    //              /   \
    //   [0x0000...]     [0x1fff...]
    const range = calculateAddressRange(BigInt(address), 2n ** 253n - 1n)
    assert.equal(range.min, min__0 - 1n)
    assert.equal(range.max, max__0 - 1n)
    assert.deepEqual(range, {
      min: BigInt('0x0000000000000000000000000000000000000000000000000000000000000000'),
      max: BigInt('0x1fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
    })
  })

  const [min___0, max___0] = halfRange(min__0, max__0)
  it('should calculate address range for radius = 2**252 - 1', () => {
    //                                             0x
    //                              0 - _ _ _ _ _ _  _ _ _ _ _ _ _ _
    //               0 1 2 3 4 5 6 7 8 9 a b c d e f
    //              /                               \
    //   [0x0000...]                                 [0x0fff...]
    const range = calculateAddressRange(BigInt(address), 2n ** 252n - 1n)
    assert.equal(range.min, min___0 - 1n)
    assert.equal(range.max, max___0 - 1n)
    assert.deepEqual(range, {
      min: BigInt('0x0000000000000000000000000000000000000000000000000000000000000000'),
      max: BigInt('0x0fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
    })
  })

  const [min____0, max____0] = halfRange(min___0, max___0, 'min')
  it('should calculate address range for radius = 2**251 - 1', () => {
    //                                     0x
    //                      0 _ _ _ _ _ _ _  _ _ _ _ _ _ _ _
    //       - - - - - - - - 8 9 a b c d e f
    //                      /               \
    //           [0x0800...]        -        [0x0fff...]
    const range = calculateAddressRange(BigInt(address), 2n ** 251n - 1n)
    assert.equal(range.min, min____0 - 1n)
    assert.equal(range.max, max____0 - 1n)
    assert.deepEqual(range, {
      min: BigInt('0x0800000000000000000000000000000000000000000000000000000000000000'),
      max: BigInt('0x0fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
    })
  })

  const [min_____0, max_____0] = halfRange(min____0, max____0)
  it('should calculate address range for radius = 2**250 - 1', () => {
    //                                     0x
    //                      0 _ _ _ _ _ _ _  _ _ _ _ _ _ _ _
    //       _ _ _ _ _ _ _ _ 8 9 a b - - - -
    //                      /       \
    //           [0x0800...]    -    [0x0bff...]
    const range = calculateAddressRange(BigInt(address), 2n ** 250n - 1n)
    assert.equal(range.min, min_____0 - 1n)
    assert.equal(range.max, max_____0 - 1n)
    assert.deepEqual(range, {
      min: BigInt('0x0800000000000000000000000000000000000000000000000000000000000000'),
      max: BigInt('0x0bffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
    })
  })

  const [min______0, max______0] = halfRange(min_____0, max_____0, 'min')

  it('should calculate address range for radius = 2**249 - 1', () => {
    //                                     0x
    //                      0 _ _ _ _ _ _ _  _ _ _ _ _ _ _ _
    //      _ _ _ _ _ _ _ _  - - a b _ _ _ _
    //                          /   \
    //               [0x0a00...]  -  [0x0bff...]
    const range = calculateAddressRange(BigInt(address), 2n ** 249n - 1n)
    assert.equal(range.min, min______0 - 1n)
    assert.equal(range.max, max______0 - 1n)
    assert.deepEqual(range, {
      min: BigInt('0x0a00000000000000000000000000000000000000000000000000000000000000'),
      max: BigInt('0x0bffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
    })
  })

  const [min_______0, max_______0] = halfRange(min______0, max______0)

  it('should calculate address range for radius = 2**248 - 1', () => {
    //                                     0x
    //                      0 _ _ _ _ _ _ _  _ _ _ _ _ _ _ _
    //       _ _ _ _ _ _ _ _ _ _ a - _ _ _ _
    //                          / \
    //               [0x0a00...]   [0x0aff...]
    const range = calculateAddressRange(BigInt(address), 2n ** 248n - 1n)
    assert.equal(range.min, min_______0 - 1n)
    assert.equal(range.max, max_______0 - 1n)
    assert.deepEqual(range, {
      min: BigInt('0x0a00000000000000000000000000000000000000000000000000000000000000'),
      max: BigInt('0x0affffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
    })
  })
})
