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
import block0_meta from './testdata/block-0x11a86a9-meta.json'
import block0_db from './testdata/block-0x11a86a9-db.json'
import block1_meta from './testdata/block-0x11a86aa-meta.json'
import block1_db from './testdata/block-0x11a86aa-db.json'
import block2_meta from './testdata/block-0x11a86ab-meta.json'
import block2_db from './testdata/block-0x11a86ab-db.json'
import { keccak256 } from 'ethereum-cryptography/keccak.js'

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

describe('Input whole block of content', async () => {
  const database = new StateDB()
  const contentKeys = Object.keys(block0_db)
  const s = 0
  it('should store all content by key', async () => {
    for await (const key of contentKeys) {
      const storing = await database.storeContent(fromHexString(key), fromHexString(block0_db[key]))
      assert.isTrue(storing)
    }
  })
  it('should store and serve all content by key', async () => {
    for await (const key of contentKeys) {
      const retrieved = await database.getContent(fromHexString(key))
      assert.isDefined(retrieved)
      assert.deepEqual(retrieved, fromHexString(block0_db[key]))
    }
  })
  it('should retrieve all accounts from StateDB', async () => {
    const accounts = block0_meta.accounts
    for (const add of accounts) {
      const acc = await database.getAccount(add, block0_meta.stateroot)
      assert.isDefined(acc)
      const balance = await database.getBalance(add, block0_meta.stateroot)
      assert.isDefined(balance)
      const txCount = await database.getTransactionCount(add, block0_meta.stateroot)
      assert.isDefined(txCount)
    }
  })
  it('should return undefined for non-existent account', async () => {
    const nonex = await database.getAccount(toHexString(new Uint8Array(32)), block0_meta.stateroot)
    assert.isUndefined(nonex)
  })
  const accessed = block0_meta.accessList
  it('should access all storage slots', async () => {
    for (const a of accessed) {
      for (const slot of a.keys) {
        try {
          const value = await database.getStorageAt(a.address, BigInt(slot), block0_meta.stateroot)
          assert.ok(`accessed ${a.address} slot ${slot} value ${value}`)
        } catch (e: any) {
          assert.fail(e.message)
        }
      }
    }
  })
  it('should throw if non-existent', async () => {
    try {
      const value = await database.getStorageAt(accessed[0].address, 2n, block0_meta.stateroot)
      assert.fail(`should not have accessed ${accessed[0].address} slot 2: ${value}`)
    } catch {
      assert.ok(true)
    }
  })
  const codes = block0_meta.byteCode
  it('should retrieve all codehashes', async () => {
    for (const { address, codeHash } of codes) {
      const hash = await database.getAccountCodeHash(address, block0_meta.stateroot)
      assert.deepEqual(hash, fromHexString(codeHash))
    }
  })
  it('should retrieve all bytecode', async () => {
    for (const { address, codeHash } of codes) {
      const bytecode = await database.getCode(address, block0_meta.stateroot)
      assert.isDefined(bytecode)
      assert.deepEqual(keccak256(bytecode!), fromHexString(codeHash))
    }
  })
})
