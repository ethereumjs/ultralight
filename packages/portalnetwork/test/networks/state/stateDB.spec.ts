import { Trie, decodeNode } from '@ethereumjs/trie'
import { MemoryLevel } from 'memory-level'
import { assert, describe, expect, it } from 'vitest'

import { PortalTrieDB, fromHexString, toHexString } from '../../../src/index.js'
import { StateDB } from '../../../src/networks/state/statedb.js'

import type { AbstractLevel } from 'abstract-level'

describe('StateDB components', async () => {
  it('should create StateDB from constructor', () => {
    const stateDB = new StateDB(new MemoryLevel() as any)
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

  const trie = new Trie({ useKeyHashing: true, db: portalTrieDB })
  it('should be able to instantiate Trie from StateDB', () => {
    expect(trie).exist
  })

  const tKey = '0xabcd'
  const tVal = '0x1234'

  await trie.put(fromHexString(tKey), fromHexString(tVal))
  const value = await trie.get(fromHexString(tKey))

  it('should put and get trie value', async () => {
    assert.deepEqual(value, fromHexString('0x1234'), 'should find trie node in StateDB')
  })

  const tNode = await portalTrieDB.get(toHexString(trie.root()).slice(2))
  const node = decodeNode(fromHexString(tNode!))

  it('should find trie node in db', () => {
    assert.deepEqual(node.value(), value, 'should find trie node in StateDB')
    assert.deepEqual(node.value(), fromHexString('0x1234'), 'should find trie node in StateDB')
  })
})
