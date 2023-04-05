import { toHexString, UintBigintType } from '@chainsafe/ssz'
import tape from 'tape'
import {
  ContentKeyOpts,
  decodeStateNetworkContentKey,
  distance,
  getStateNetworkContentId,
  getStateNetworkContentKey,
  MODULO,
} from '../../../src/subprotocols/state/util.js'
import { randomBytes } from 'crypto'

tape('distance()', (t) => {
  t.test('should calculate distance between two values', (st) => {
    st.ok(distance(10n, 10n) === 0n, 'calculates correct distance')
    st.ok(distance(5n, MODULO - 1n) === 6n, 'calculates correct distance')
    st.ok(distance(MODULO - 1n, 6n) === 7n, 'calculates correct distance')
    st.ok(distance(5n, 1n) === 4n, 'calculates correct distance')
    st.ok(distance(1n, 5n) === 4n, 'calculates correct distance')
    st.ok(distance(0n, 2n ** 255n) === 2n ** 255n, 'calculates correct distance')
    st.ok(distance(0n, 2n ** 255n + 1n) === 2n ** 255n - 1n, 'calculates correct distance')
    st.end()
  })
  t.end()
})

tape('getStateNetworkContentKey', (t) => {
  const address = toHexString(randomBytes(20))
  const stateRoot = randomBytes(32)
  const slot = 64n
  const codeHash = randomBytes(32)
  t.test('should create correct content key for account trie proof', (st) => {
    const opts: ContentKeyOpts = {
      address,
      stateRoot,
    }
    const key = getStateNetworkContentKey(opts)

    st.equal(key[0], 0, 'correct content type')
    st.equal(
      toHexString(key),
      '0x00' + address.slice(2) + stateRoot.toString('hex'),
      'correct content key'
    )

    const decoded = decodeStateNetworkContentKey(key)

    st.equal(decoded.address, address, 'decoded contentKey has correct address')
    st.equal(
      toHexString(decoded.stateRoot!),
      toHexString(stateRoot),
      'decoded contentKey has correct stateRoot'
    )
    st.end()
  })
  t.test('should create correct content key for contract storage trie proof', (st) => {
    const opts: ContentKeyOpts = {
      address,
      stateRoot,
      slot,
    }
    const key = getStateNetworkContentKey(opts)
    const slotHex = toHexString(new UintBigintType(32).serialize(slot))
    st.equal(key[0], 1, 'correct content type')
    st.equal(
      toHexString(key),
      '0x01' + address.slice(2) + slotHex.slice(2) + stateRoot.toString('hex'),
      'correct content key'
    )
    const decoded = decodeStateNetworkContentKey(key)
    st.equal(decoded.address, address, 'decoded contentKey has correct address')
    st.equal(
      toHexString(decoded.stateRoot!),
      toHexString(stateRoot),
      'decoded contentKey has correct stateRoot'
    )
    st.equal(decoded.slot!, slot, 'decoded contentKey has correct slot')
    st.end()
  })
  t.test('should create correct content key for contract byte code', (st) => {
    const opts: ContentKeyOpts = {
      address,
      codeHash,
    }
    const key = getStateNetworkContentKey(opts)
    st.equal(key[0], 2, 'correct content type')
    st.equal(
      toHexString(key),
      '0x02' + address.slice(2) + codeHash.toString('hex'),
      'correct content key'
    )
    const decoded = decodeStateNetworkContentKey(key)
    st.equal(decoded.address, address, 'decoded contentKey has correct address')
    st.equal(
      toHexString(decoded.codeHash!),
      toHexString(codeHash),

      'decoded contentKey has correct codeHash'
    )
    st.end()
  })
  t.end()
})

tape('getStateNetworkContentId', (t) => {
  t.test('should create correct content id for account trie proof', (st) => {
    const address = toHexString(randomBytes(20))
    const stateRoot = randomBytes(32)
    const opts: ContentKeyOpts = {
      address,
      stateRoot,
    }
    const id = getStateNetworkContentId(opts)
    st.equal(id.length, 32, 'createed hashed content id for AccountTrieProofs')
    st.end()
  })
  t.test('should create correct content id for contract storage trie proof', (st) => {
    const address = toHexString(randomBytes(20))
    const stateRoot = randomBytes(32)
    const slot = 64n
    const opts: ContentKeyOpts = {
      address,
      stateRoot,
      slot,
    }
    const id = getStateNetworkContentId(opts)
    st.equal(id.length, 32, 'createed hashed content id for ContractStorageTrieProofs')
    st.end()
  })
  t.test('should create correct content id for contract byte code', (st) => {
    const address = toHexString(randomBytes(20))
    const codeHash = randomBytes(32)
    const opts: ContentKeyOpts = {
      address,
      codeHash,
    }
    const id = getStateNetworkContentId(opts)
    st.equal(id.length, 32, 'createed hashed content id for ContractByteCode')
    st.end()
  })
  t.end()
})
