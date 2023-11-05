import { describe, it, assert } from 'vitest'
import testdata from './content.json'
import {
  AccountTrieProofType,
  StateNetworkContentType,
} from '../../../src/subprotocols/state/types.js'
import { decodeStateNetworkContentKey } from '../../../src/subprotocols/state/util.js'
import { StateDB } from '../../../src/subprotocols/state/statedb.js'
import { fromHexString, toHexString } from '@chainsafe/ssz'

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
