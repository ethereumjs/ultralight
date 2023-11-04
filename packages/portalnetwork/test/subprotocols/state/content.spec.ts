import { describe, it, assert, assertType } from 'vitest'
import testdata from './content.json'
import {
  AccountTrieProofType,
  ContractStorageTrieProofType,
  StateNetworkContentType,
} from '../../../src/subprotocols/state/types.js'
import { decodeStateNetworkContentKey } from '../../../src/subprotocols/state/util.js'
import { fromHexString } from '@chainsafe/ssz'
import { Account } from '@ethereumjs/util'
import { Trie } from '@ethereumjs/trie'
import { RLP } from '@ethereumjs/rlp'
import { keccak256 } from 'ethereum-cryptography/keccak.js'

describe('Account Trie Proof Content Type', async () => {
  const contentKey = testdata.ATP.contentKey
  const content = testdata.ATP.content

  const decoded = decodeStateNetworkContentKey(fromHexString(contentKey)) as {
    contentType: StateNetworkContentType.AccountTrieProof
    address: Uint8Array
    stateRoot: Uint8Array
  }
  const { witnesses, balance, nonce, codeHash, storageRoot } = AccountTrieProofType.deserialize(
    fromHexString(content),
  )
  it('should deserialize content into account data and witnesses', async () => {
    assertType<Uint8Array>(decoded.address)
    assertType<Uint8Array>(decoded.stateRoot)
    assertType<Uint8Array[]>(witnesses)
    assertType<bigint>(balance)
    assertType<bigint>(nonce)
    assertType<Uint8Array>(codeHash)
    assertType<Uint8Array>(storageRoot)
  })

  const rootNode = witnesses[0]
  it('should include proof for state root', async () => {
    assert.deepEqual(decoded.stateRoot, new Trie()['hash'](rootNode))
  })

  const trie = new Trie({ useKeyHashing: true })
  await trie.fromProof(witnesses)
  const account = await trie.get(decoded.address)

  const expected = Account.fromAccountData({
    nonce,
    balance,
    codeHash,
    storageRoot,
  })

  it('should have valid proof for state root', () => {
    assert.deepEqual(trie.root(), decoded.stateRoot)
  })
  it('should include proof for account', async () => {
    assert.deepEqual(expected.serialize(), account)
  })
})

describe('Contract Storage Trie Proof Content Type', async () => {
  const contentKey = testdata.CSTP.contentKey
  const content = testdata.CSTP.content

  const decoded = decodeStateNetworkContentKey(fromHexString(contentKey)) as {
    contentType: StateNetworkContentType.ContractStorageTrieProof
    address: Uint8Array
    slot: bigint
    stateRoot: Uint8Array
  }
  it('should decode content key', async () => {
    assertType<Uint8Array>(decoded.address)
    assertType<bigint>(decoded.slot)
    assertType<Uint8Array>(decoded.stateRoot)
  })

  const { data, witnesses } = ContractStorageTrieProofType.deserialize(fromHexString(content))
  it('should deserialize content into data and witnesses', async () => {
    assertType<Uint8Array>(data)
    assertType<Uint8Array[]>(witnesses)
  })

  const root = witnesses[0]
  const slotBytes = fromHexString('0x' + decoded.slot.toString(16).padStart(64, '0'))
  const trie = new Trie({ useKeyHashing: true })
  await trie.fromProof(witnesses)
  const value = await trie.get(slotBytes)
  const decodedValue = RLP.decode(value!) as Uint8Array
  assert.deepEqual(trie.root(), trie['hash'](root))
  assert.deepEqual(data, decodedValue)
})

describe('Contract Byte Code Content Type', async () => {
  const contentKey = testdata.BYTECODE.contentKey
  const content = testdata.BYTECODE.content

  const decoded = decodeStateNetworkContentKey(fromHexString(contentKey)) as {
    contentType: StateNetworkContentType.ContractByteCode
    address: Uint8Array
    codeHash: Uint8Array
  }
  it('should decode content key', async () => {
    assertType<Uint8Array>(decoded.address)
    assertType<Uint8Array>(decoded.codeHash)
    assert.equal(decoded.contentType, StateNetworkContentType.ContractByteCode)
    assert.deepEqual(fromHexString(testdata.BYTECODE.address), decoded.address)
  })

  const bytecode = fromHexString(content)
  const hashed = keccak256(bytecode)

  it('hashed content should match codeHash from key', async () => {
    assert.equal(hashed.length, 32)
    assert.equal(decoded.codeHash.length, 32)
    assert.deepEqual(hashed, decoded.codeHash)
  })
})
