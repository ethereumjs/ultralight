import { UintBigintType, fromHexString, toHexString } from '@chainsafe/ssz'
import { Address, randomBytes } from '@ethereumjs/util'
import { assert, describe, it } from 'vitest'

import {
  AccountTrieProofKeyType,
  ContractByteCodeKeyType,
  ContractStorageTrieKeyType,
  StateNetworkContentType,
} from '../../../src/networks/state/types.js'
import {
  MODULO,
  calculateAddressRange,
  decodeStateNetworkContentKey,
  distance,
  getStateNetworkContentId,
  getStateNetworkContentKey,
  keyType,
} from '../../../src/networks/state/util.js'

describe('distance()', () => {
  it('should calculate distance between two values', () => {
    assert.ok(distance(10n, 10n) === 0n, 'calculates correct distance')
    assert.ok(distance(5n, MODULO - 1n) === 6n, 'calculates correct distance')
    assert.ok(distance(MODULO - 1n, 6n) === 7n, 'calculates correct distance')
    assert.ok(distance(5n, 1n) === 4n, 'calculates correct distance')
    assert.ok(distance(1n, 5n) === 4n, 'calculates correct distance')
    assert.ok(distance(0n, 2n ** 255n) === 2n ** 255n, 'calculates correct distance')
    assert.ok(distance(0n, 2n ** 255n + 1n) === 2n ** 255n - 1n, 'calculates correct distance')
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

const slot = 61569530748316642040141387100264439523941337252689762529032498544831989427314n
const codeHash = '0x578e1612e8e59247b6b92fe069b302b41e3436612540e005586ad67b402b6f8a'
const accountAddress = '0x1bf30c1dd6ccf28164bcc32b7479dc6fecbe57ef'
const stateRoot = '0x42fd68502357b03084c2fad9e3a65277140a759a63c5e438e0aaf3f9bd7dc1bc'

describe('Account Trie Proof Key methods', () => {
  const keySerialized_ATP = AccountTrieProofKeyType.serialize({
    address: fromHexString(accountAddress),
    stateRoot: fromHexString(stateRoot),
  })
  it('should serialize AccountTrieProof contentKey SSZ object', () => {
    assert.deepEqual(
      keySerialized_ATP,
      Uint8Array.from([...fromHexString(accountAddress), ...fromHexString(stateRoot)]),
    )
    assert.equal(toHexString(keySerialized_ATP), accountAddress + stateRoot.slice(2))
  })

  it('should deserialize back to object', () => {
    const decoded = AccountTrieProofKeyType.deserialize(keySerialized_ATP)
    assert.equal(toHexString(decoded.address), accountAddress)
    assert.equal(toHexString(decoded.stateRoot), stateRoot)
  })

  const contentKey_ATP = getStateNetworkContentKey({
    contentType: StateNetworkContentType.AccountTrieNode,
    address: Address.fromString(accountAddress),
    stateRoot: fromHexString(stateRoot),
  })

  it('should be identified as AccountTrieProof contentKey', () => {
    assert.equal(contentKey_ATP[0], 0x10)
    assert.equal(keyType(contentKey_ATP), StateNetworkContentType.AccountTrieNode)
  })

  it('should include the serialized ssz object after a 1 byte identifier', () => {
    assert.deepEqual(contentKey_ATP.slice(1), keySerialized_ATP)
  })

  it('should decode back to the original object', () => {
    const decoded = decodeStateNetworkContentKey(contentKey_ATP) as any
    assert.deepEqual(Object.keys(decoded), ['contentType', 'address', 'stateRoot'])
    assert.equal(decoded.contentType, StateNetworkContentType.AccountTrieNode)
    assert.equal(toHexString(decoded.address), accountAddress)
    assert.equal(toHexString(decoded.stateRoot), stateRoot)
  })

  it('should calculate contentId', () => {
    const contentId = getStateNetworkContentId({
      contentType: StateNetworkContentType.AccountTrieNode,
      address: Address.fromString(accountAddress),
    })
    assert.equal(contentId.length, 32)
  })
})

describe('Contract Storage Trie Proof Key methods', () => {
  const keySerialized_CSTP = ContractStorageTrieKeyType.serialize({
    address: fromHexString(accountAddress),
    slot,
    stateRoot: fromHexString(stateRoot),
  })
  it('should serialize ContractStorageTrieProof contentKey SSZ object', () => {
    const address = toHexString(keySerialized_CSTP).slice(0, 42)
    assert.equal(address, accountAddress)
    assert.equal(stateRoot, toHexString(keySerialized_CSTP.slice(-32)))
    assert.deepEqual(new UintBigintType(32).serialize(slot), keySerialized_CSTP.slice(20, 52))
  })

  it('should deserialize back to object', () => {
    const decoded = ContractStorageTrieKeyType.deserialize(keySerialized_CSTP) as any
    assert.equal(toHexString(decoded.address), accountAddress)
    assert.equal(toHexString(decoded.stateRoot), stateRoot)
    assert.equal(decoded.slot, slot)
  })

  const contentKey_CSTP = getStateNetworkContentKey({
    contentType: StateNetworkContentType.ContractTrieNode,
    address: Address.fromString(accountAddress),
    slot,
    stateRoot: fromHexString(stateRoot),
  })

  it('should be identified as ContractStorageTrieProof contentKey', () => {
    assert.equal(contentKey_CSTP[0], 0x11)
    assert.equal(keyType(contentKey_CSTP), StateNetworkContentType.ContractTrieNode)
  })

  it('should include the serialized ssz object after a 1 byte identifier', () => {
    assert.deepEqual(contentKey_CSTP.slice(1), keySerialized_CSTP)
  })

  it('should decode back to the original object', () => {
    const decoded = decodeStateNetworkContentKey(contentKey_CSTP) as any
    assert.deepEqual(Object.keys(decoded), ['contentType', 'address', 'slot', 'stateRoot'])
    assert.equal(decoded.contentType, StateNetworkContentType.ContractTrieNode)
  })
})

describe('Contract Byte Code Key methods', () => {
  const keySerialized_CBC = ContractByteCodeKeyType.serialize({
    address: fromHexString(accountAddress),
    codeHash: fromHexString(codeHash),
  })
  it('should serialize ContractByteCode contentKey SSZ object', () => {
    const address = toHexString(keySerialized_CBC).slice(0, 42)
    assert.equal(address, accountAddress)
    assert.equal(codeHash, toHexString(keySerialized_CBC.slice(-32)))
  })

  it('should deserialize back to object', () => {
    const decoded = ContractByteCodeKeyType.deserialize(keySerialized_CBC) as any
    assert.equal(toHexString(decoded.address), accountAddress)
    assert.equal(toHexString(decoded.codeHash), codeHash)
  })

  const contentKey_CBC = getStateNetworkContentKey({
    contentType: StateNetworkContentType.ContractByteCode,
    address: Address.fromString(accountAddress),
    codeHash: fromHexString(codeHash),
  })

  it('should be identified as ContractByteCode contentKey', () => {
    assert.equal(contentKey_CBC[0], 0x12)
    assert.equal(keyType(contentKey_CBC), StateNetworkContentType.ContractByteCode)
  })

  it('should include the serialized ssz object after a 1 byte identifier', () => {
    assert.deepEqual(contentKey_CBC.slice(1), keySerialized_CBC)
  })

  it('should decode back to the original object', () => {
    const decoded = decodeStateNetworkContentKey(contentKey_CBC) as any
    assert.deepEqual(Object.keys(decoded), ['contentType', 'address', 'codeHash'])
    assert.equal(decoded.contentType, StateNetworkContentType.ContractByteCode)
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
