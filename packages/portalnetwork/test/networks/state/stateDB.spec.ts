import { Trie } from '@ethereumjs/trie'
import { MemoryLevel } from 'memory-level'
import { describe, expect, it } from 'vitest'

import { PortalTrieDB } from '../../../src/index.js'
import { StateDB } from '../../../src/networks/state/statedb.js'

describe('StateDB components', async () => {
  const portalTrieDB = new PortalTrieDB(new MemoryLevel() as any)
  it('should create PortalTrieDB from constructor', () => {
    expect(portalTrieDB).exist
  })
  const stateDB = new StateDB(new MemoryLevel() as any)
  it('should create StateDB from constructor', () => {
    expect(stateDB).exist
  })
  const trie = new Trie({ useKeyHashing: true, db: stateDB.db })
  it('should be able to instantiate Trie from StateDB', () => {
    expect(trie).exist
  })
})
