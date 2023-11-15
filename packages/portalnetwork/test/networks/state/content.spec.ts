import { describe, it, assert, assertType } from 'vitest'
import testdata from './content.json'
import {
  AccountTrieProofType,
  ContractStorageTrieProofType,
  MPTWitnessesType,
  StateNetworkContentType,
} from '../../../src/networks/state/types.js'
import { decodeStateNetworkContentKey } from '../../../src/networks/state/util.js'
import { ContainerType, UintBigintType, fromHexString, toHexString } from '@chainsafe/ssz'
import { Account } from '@ethereumjs/util'
import { Trie } from '@ethereumjs/trie'
import { keccak256 } from 'ethereum-cryptography/keccak.js'
import { Bytes32Type } from '../../../src'

const oldCSType = new ContainerType({
  witnesses: MPTWitnessesType,
  data: Bytes32Type,
})
const oldAType = new ContainerType({
  witnesses: MPTWitnessesType,
  nonce: new UintBigintType(8),
  balance: new UintBigintType(32),
  codeHash: Bytes32Type,
  storageRoot: Bytes32Type,
})
describe('Account Trie Proof Content Type', async () => {
  const contentKey = testdata.ATP.contentKey
  const content = testdata.ATP.content

  const decoded = decodeStateNetworkContentKey(fromHexString(contentKey)) as {
    contentType: StateNetworkContentType.AccountTrieProof
    address: Uint8Array
    stateRoot: Uint8Array
  }
  const { witnesses } = AccountTrieProofType.deserialize(fromHexString(content))
  it('should deserialize content into account data and witnesses', async () => {
    assertType<Uint8Array>(decoded.address)
    assertType<Uint8Array>(decoded.stateRoot)
    assertType<Uint8Array[]>(witnesses)
    assert.deepEqual(decoded.address, fromHexString('0xae2fc483527b8ef99eb5d9b44875f005ba1fae13'))
  })

  const rootNode = witnesses[0]
  it('should include proof for state root', async () => {
    assert.deepEqual(decoded.stateRoot, new Trie()['hash'](rootNode))
  })

  const trie = new Trie({ useKeyHashing: true })
  await trie.fromProof(witnesses)
  it('should have valid proof for state root', () => {
    assert.deepEqual(trie.root(), decoded.stateRoot)
  })
  const accountRLP = await trie.get(decoded.address)
  it('should retrieve account from trie', async () => {
    assert.isDefined(accountRLP)
    const account = Account.fromRlpSerializedAccount(accountRLP!)
    assert.isDefined(account)
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
    assert.deepEqual(decoded.address, fromHexString('0x4c083084c9d50334b343c44ec97d16011303cc73'))
  })

  const { witnesses } = ContractStorageTrieProofType.deserialize(fromHexString(content))
  it('should deserialize content into data and witnesses', async () => {
    assertType<Uint8Array[]>(witnesses)
  })

  const root = witnesses[0]
  // const slotBytes = fromHexString('0x' + decoded.slot.toString(16).padStart(64, '0'))
  const trie = new Trie({ useKeyHashing: true })
  await trie.fromProof(witnesses)
  // const value = await trie.get(slotBytes)
  // const decodedValue = RLP.decode(value!) as Uint8Array
  assert.deepEqual(trie.root(), trie['hash'](root))
  // assert.deepEqual(data, decodedValue)
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
    assert.deepEqual(
      decoded.codeHash,
      fromHexString('0x0be74cc05824041ef286fd08582cdfacec7784a35af72f937acf64ade5073da1'),
    )
  })

  const bytecode = fromHexString(content)
  const hashed = keccak256(bytecode)

  it('hashed content should match codeHash from key', async () => {
    assert.equal(hashed.length, 32)
    assert.equal(decoded.codeHash.length, 32)
    assert.deepEqual(hashed, decoded.codeHash)
  })
})
