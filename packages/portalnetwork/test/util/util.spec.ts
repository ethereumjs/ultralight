import { log2Distance } from '@chainsafe/discv5'
import { unprefixedHexToBytes } from '@ethereumjs/util'
import { assert, describe, it } from 'vitest'

import {
  arrayByteLength,
  dirSize,
  generateRandomNodeIdAtDistance,
  shortId,
} from '../../src/util/index.js'

describe('utility method tests', async () => {
  const nodeId = '82418605a77ea8c8f47802d71661d3812ff64e70fd2fc5f0ff57a113185b2c41'

  it('should correctly shorten node id', async () => {
    const short = shortId(nodeId)
    assert.ok(short === '82418...b2c41', 'correctly shortened node id')
  })

  for (let i = 1; i < 256; i++) {
    it(`should correctly generate random node id at distance ${i}`, async () => {
      const randomNodeId = generateRandomNodeIdAtDistance(nodeId, i)
      const array = unprefixedHexToBytes(randomNodeId)
      assert.equal(array.length, 32, 'generated random node ID has correct length')
      assert.equal(
        log2Distance(nodeId, randomNodeId),
        i,
        `calculated random node ID at distance ${i}`,
      )
    })
  }

  const arrayOfUint8Arrays = [Uint8Array.from([1, 2, 3]), Uint8Array.from([1, 2])]
  it('should correctly compute byte length of array of Uint8Arrays', async () => {
    assert.equal(
      arrayByteLength(arrayOfUint8Arrays),
      5,
      'computed correct length of nested Uint8Arrays',
    )
    assert.equal(await dirSize('./test/util/testDir'), 0.00002765655517578125)
  })
})
