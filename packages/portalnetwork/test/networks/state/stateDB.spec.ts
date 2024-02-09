import { MemoryLevel } from 'memory-level'
import { describe, expect, it } from 'vitest'

import { PortalTrieDB } from '../../../src/index.js'

describe('PortalTrieDB', async () => {
  it('should create PortalTrieDB from constructor', () => {
    const portalTrieDB = new PortalTrieDB(new MemoryLevel() as any)
    expect(portalTrieDB).exist
  })
})
