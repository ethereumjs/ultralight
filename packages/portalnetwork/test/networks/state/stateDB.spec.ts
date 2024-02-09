import { MemoryLevel } from 'memory-level'
import { describe, expect, it } from 'vitest'

import { PortalTrieDB } from '../../../src/index.js'
import { StateDB } from '../../../src/networks/state/statedb.js'

describe('StateDB', async () => {
  it('should create PortalTrieDB from constructor', () => {
    const portalTrieDB = new PortalTrieDB(new MemoryLevel() as any)
    expect(portalTrieDB).exist
  })
  it('should create StateDB from constructor', () => {
    const stateDB = new StateDB(new MemoryLevel() as any)
    expect(stateDB).exist
  })
})
