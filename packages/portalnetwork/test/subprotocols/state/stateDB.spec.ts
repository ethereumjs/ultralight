import { describe, it, assert } from 'vitest'
import testdata from './content.json'
import {
  AccountTrieProofType,
  ContractStorageTrieProofType,
  StateNetworkContentType,
} from '../../../src/subprotocols/state/types.js'
import { decodeStateNetworkContentKey } from '../../../src/subprotocols/state/util.js'
import { StateDB } from '../../../src/subprotocols/state/statedb.js'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { RLP } from '@ethereumjs/rlp'

describe('Input AccountTrieProof', async () => {
  const database = new StateDB()
  const contentKey = fromHexString(testdata.ATP.contentKey)
  const content = fromHexString(testdata.ATP.content)
  await database.storeContent(contentKey, content)
  const { address, stateRoot } = decodeStateNetworkContentKey(contentKey) as {
    contentType: StateNetworkContentType.AccountTrieProof
    address: Uint8Array
    stateRoot: Uint8Array
  }
  it('should record state root', () => {
    assert.isTrue(database.stateRoots.has(toHexString(stateRoot)))
  })
  it('should record address', () => {
    assert.isTrue(database.accounts.has(toHexString(address)))
  })

  const accountTrie = database.getAccountTrie(toHexString(stateRoot))
  it('should store account in account trie for stateroot', async () => {
    assert.deepEqual(accountTrie.root(), stateRoot)
    const account = await accountTrie.get(address)
    assert.isNotNull(account)
  })
  it('should retrieve account at state root', async () => {
    const account = await database.getAccount(toHexString(address), toHexString(stateRoot))
    assert.isDefined(account)
  })
  it('should serve eth_getBalance from database', async () => {
    const balance = await database.getBalance(toHexString(address), toHexString(stateRoot))
    assert.equal(balance, BigInt(testdata.ATP.balance))
    assert.isDefined(balance)
  })
  it('should serve eth_getTransactionCount from database', async () => {
    const nonce = await database.getTransactionCount(toHexString(address), toHexString(stateRoot))
    assert.isDefined(nonce)
    assert.equal(nonce, BigInt(testdata.ATP.nonce))
  })
  it('should rebuild account trie proof content from database', async () => {
    const account = await database.getAccount(toHexString(address), toHexString(stateRoot))
    const trie = database.getAccountTrie(toHexString(stateRoot))
    const proof = await trie.createProof(address)
    const content = AccountTrieProofType.serialize({
      balance: account!.balance,
      nonce: account!.nonce,
      codeHash: account!.codeHash,
      storageRoot: account!.storageRoot,
      witnesses: proof,
    })
    assert.deepEqual(content, fromHexString(testdata.ATP.content))
  })
})

describe('Input ContractStorageProof', async () => {
  const database = new StateDB()
  const contentKey = fromHexString(testdata.CSTP.contentKey)
  const content = fromHexString(testdata.CSTP.content)
  await database.storeContent(contentKey, content)
  const { address, stateRoot, slot } = decodeStateNetworkContentKey(contentKey) as {
    contentType: StateNetworkContentType.ContractStorageTrieProof
    address: Uint8Array
    stateRoot: Uint8Array
    slot: bigint
  }
  it('should record state root', () => {
    assert.isTrue(database.stateRoots.has(toHexString(stateRoot)))
    assert.isTrue(database.storageTries.has(toHexString(stateRoot)))
  })
  it('should record address', () => {
    assert.isTrue(database.accounts.has(toHexString(address)))
    const tries = database.storageTries.get(toHexString(stateRoot))
    assert.isDefined(tries)
    assert.isTrue(tries!.has(toHexString(address)))
  })
  it('should serve eth_getStorageAt from database', async () => {
    const storage = await database.getStorageAt(toHexString(address), slot, toHexString(stateRoot))
    const data = RLP.decode(storage!) as Uint8Array
    assert.isDefined(storage)
    assert.equal(toHexString(data), testdata.CSTP.value)
  })
  it('should rebuild contract storage proof content from database', async () => {
    const storageTrie = await database.getStorageTrie(toHexString(stateRoot), toHexString(address))
    const value = await storageTrie.get(fromHexString(testdata.CSTP.slot))
    const data = RLP.decode(value!) as Uint8Array
    const witnesses = await storageTrie.createProof(fromHexString(testdata.CSTP.slot))
    const content = ContractStorageTrieProofType.serialize({
      data,
      witnesses,
    })
    assert.deepEqual(content, fromHexString(testdata.CSTP.content))
  })
})

describe('Input ContractByteCode content', async () => {
  const database = new StateDB()
  const contentKey = fromHexString(testdata.BYTECODE.contentKey)
  const content = fromHexString(testdata.BYTECODE.content)
  await database.storeContent(contentKey, content)
  const { address, codeHash } = decodeStateNetworkContentKey(contentKey) as {
    contentType: StateNetworkContentType.ContractByteCode
    address: Uint8Array
    codeHash: Uint8Array
  }
  it('should record address', () => {
    assert.isTrue(database.accounts.has(toHexString(address)))
  })
  it('should retrieve bytecode by codehash', async () => {
    const bytecode = await database.getContractByteCode(toHexString(codeHash))
    assert.deepEqual(bytecode, fromHexString(testdata.BYTECODE.content))
  })
  it('should retrieve codehash', async () => {
    const hash = await database.getAccountCodeHash(toHexString(address))
    assert.deepEqual(hash, codeHash)
  })
  it('should serve eth_getCode', async () => {
    const bytecode = await database.getCode(toHexString(address))
    assert.deepEqual(bytecode, fromHexString(testdata.BYTECODE.content))
  })
})
