import { describe, it, assert } from 'vitest'
import {
  decodeStateNetworkContentKey,
  distance,
  getStateNetworkContentId,
  getStateNetworkContentKey,
  keyType,
  MODULO,
} from '../../../src/networks/state/util.js'
import { Address, randomBytes } from '@ethereumjs/util'
import {
  AccountTrieProofKeyType,
  ContractByteCodeKeyType,
  ContractStorageTrieKeyType,
  StateNetworkContentType,
} from '../../../src/networks/state/types.js'
import { UintBigintType, fromHexString, toHexString } from '@chainsafe/ssz'

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
    const contentKey = Uint8Array.from([0, ...randHash])
    const type = keyType(contentKey)
    assert.equal(type, StateNetworkContentType.AccountTrieProof)
  })
  it('should indentify ContractStorageTrieProof contentKey', () => {
    const contentKey = Uint8Array.from([1, ...randHash])
    const type = keyType(contentKey)
    assert.equal(type, StateNetworkContentType.ContractStorageTrieProof)
  })
  it('should indentify ContractByteCode contentKey', () => {
    const contentKey = Uint8Array.from([2, ...randHash])
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
    contentType: StateNetworkContentType.AccountTrieProof,
    address: Address.fromString(accountAddress),
    stateRoot: fromHexString(stateRoot),
  })

  it('should be identified as AccountTrieProof contentKey', () => {
    assert.equal(contentKey_ATP[0], 0)
    assert.equal(keyType(contentKey_ATP), StateNetworkContentType.AccountTrieProof)
  })

  it('should include the serialized ssz object after a 1 byte identifier', () => {
    assert.deepEqual(contentKey_ATP.slice(1), keySerialized_ATP)
  })

  it('should decode back to the original object', () => {
    const decoded = decodeStateNetworkContentKey(contentKey_ATP) as any
    assert.deepEqual(Object.keys(decoded), ['contentType', 'address', 'stateRoot'])
    assert.equal(decoded.contentType, StateNetworkContentType.AccountTrieProof)
    assert.equal(toHexString(decoded.address), accountAddress)
    assert.equal(toHexString(decoded.stateRoot), stateRoot)
  })

  it('should calculate contentId', () => {
    const contentId = getStateNetworkContentId({
      contentType: StateNetworkContentType.AccountTrieProof,
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
    contentType: StateNetworkContentType.ContractStorageTrieProof,
    address: Address.fromString(accountAddress),
    slot,
    stateRoot: fromHexString(stateRoot),
  })

  it('should be identified as ContractStorageTrieProof contentKey', () => {
    assert.equal(contentKey_CSTP[0], 1)
    assert.equal(keyType(contentKey_CSTP), StateNetworkContentType.ContractStorageTrieProof)
  })

  it('should include the serialized ssz object after a 1 byte identifier', () => {
    assert.deepEqual(contentKey_CSTP.slice(1), keySerialized_CSTP)
  })

  it('should decode back to the original object', () => {
    const decoded = decodeStateNetworkContentKey(contentKey_CSTP) as any
    assert.deepEqual(Object.keys(decoded), ['contentType', 'address', 'slot', 'stateRoot'])
    assert.equal(decoded.contentType, StateNetworkContentType.ContractStorageTrieProof)
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
    assert.equal(contentKey_CBC[0], 2)
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
