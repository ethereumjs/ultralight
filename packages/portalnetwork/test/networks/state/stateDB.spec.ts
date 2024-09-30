import { Trie, decodeNode } from '@ethereumjs/trie'
import { bytesToUnprefixedHex } from '@ethereumjs/util'
import { MemoryLevel } from 'memory-level'
import { assert, describe, expect, it } from 'vitest'

import {
  AccountTrieNodeOffer,
  AccountTrieNodeRetrieval,
  PortalTrieDB,
  StateNetworkContentKey,
  StateNetworkContentType,
  hexToBytes,
  getDatabaseContent,
  getDatabaseKey,
  bytesToHex,
} from '../../../src/index.js'
import { StateDB } from '../../../src/networks/state/statedb.js'

import testdata from './testdata/accountNodeSamples.json'

import type { TAccountTrieNodeKey } from '../../../src/index.js'
import type { AbstractLevel } from 'abstract-level'

describe('StateDB components', async () => {
  it('should create StateDB from constructor', () => {
    const stateDB = new StateDB(
      new MemoryLevel({
        createIfMissing: true,
      }) as AbstractLevel<string, string, string>,
    )
    expect(stateDB).exist
  })
  const portalTrieDB = new PortalTrieDB(
    new MemoryLevel({
      createIfMissing: true,
    }) as AbstractLevel<string, string, string>,
  )
  await portalTrieDB.open()
  it('should create PortalTrieDB from constructor', () => {
    expect(portalTrieDB).exist
  })

  const trie = new Trie({ useKeyHashing: true, db: portalTrieDB, useNodePruning: true })
  it('should be able to instantiate Trie from StateDB', () => {
    expect(trie).exist
  })

  const tKey = '0xabcd'
  const tVal = '0x1234'

  await trie.put(hexToBytes(tKey), hexToBytes(tVal))
  const value = await trie.get(hexToBytes(tKey))

  it('should put and get trie value', async () => {
    assert.deepEqual(value, hexToBytes('0x1234'), 'should find trie node in StateDB')
  })
  const rootHex = bytesToUnprefixedHex(trie.root())
  const tNode = await portalTrieDB.get(rootHex)
  const node = decodeNode(hexToBytes('0x' + tNode!))

  it('should find trie node in db', () => {
    assert.deepEqual(node.value(), value, 'should find trie node in StateDB')
    assert.deepEqual(node.value(), hexToBytes('0x1234'), 'should find trie node in StateDB')
  })

  it('should delete node from trie database', async () => {
    await portalTrieDB.del(rootHex)
    try {
      await trie.get(hexToBytes(tKey), true)
      assert.fail('value should be deleted from trie')
    } catch {
      assert.ok('deleted value deleted')
    }
  })
})

describe('database key / database contents', async () => {
  const stateDB = new StateDB(
    new MemoryLevel({
      createIfMissing: true,
    }) as AbstractLevel<string, string, string>,
  )
  await stateDB.db.open()
  const [sampleKey, sampleContent] = testdata[0] as [string, object]
  const sampleContentKey = StateNetworkContentKey.decode(hexToBytes(sampleKey))
  const sampleContentBytes = Uint8Array.from(Object.values(sampleContent))
  const content = AccountTrieNodeOffer.deserialize(sampleContentBytes)
  const { nodeHash, path } = sampleContentKey as TAccountTrieNodeKey
  const { blockHash, proof } = content
  const nodeSample = proof.slice(-1)[0]
  const contentNodeSample = AccountTrieNodeRetrieval.serialize({ node: nodeSample })
  it('should correctly decode sample', () => {
    expect(sampleContentKey).exist
    expect(content).exist
    expect(nodeHash).exist
    expect(path).exist
    expect(blockHash).exist
    expect(proof).exist
  })
  const dbKey = getDatabaseKey(hexToBytes(sampleKey))
  it('should get dbKey from contentKey', () => {
    expect(dbKey).toEqual(bytesToUnprefixedHex(nodeHash))
  })
  const dbContent = getDatabaseContent(StateNetworkContentType.AccountTrieNode, contentNodeSample)
  it('should get dbContent from content', () => {
    assert.deepEqual(hexToBytes('0x' + dbContent), nodeSample)
  })
  await stateDB.storeContent(hexToBytes(sampleKey), contentNodeSample)
  const retrieved = await stateDB.getContent(hexToBytes(sampleKey))
  it('should put and get node using AccountTrieNode Content and Key', () => {
    assert.equal(retrieved, bytesToHex(contentNodeSample))
  })
  const trie = new Trie({ useKeyHashing: true, db: stateDB.db })
  const node = await trie.database().db.get(bytesToUnprefixedHex(nodeHash))
  it('should have trie node in trie', async () => {
    assert.equal(node, bytesToUnprefixedHex(nodeSample))
  })
})
