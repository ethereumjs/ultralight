import { describe, it, assert } from 'vitest'
import {
  shortId,
  generateRandomNodeIdAtDistance,
  arrayByteLength,
  dirSize,
} from '../../src/util/index.js'
import { log2Distance } from '@chainsafe/discv5'

describe('utility method tests', async () => {
  const nodeId = '82418605a77ea8c8f47802d71661d3812ff64e70fd2fc5f0ff57a113185b2c41'

  it('should correctly shorten node id', async () => {
    const short = shortId(nodeId)
    assert.ok(short === '82418...b2c41', 'correctly shortened node id')
  })

  let randomNodeId: string
  it('should correctly generate random node id at distance', async () => {
    randomNodeId = generateRandomNodeIdAtDistance(nodeId, 255)
    assert.equal(
      log2Distance(nodeId, randomNodeId),
      255,
      'calculated random node ID at distance 255',
    )
  })

  it('should correctly generate random node id at distance', async () => {
    randomNodeId = generateRandomNodeIdAtDistance(nodeId, 25)
    assert.equal(log2Distance(nodeId, randomNodeId), 25, 'calculated random node id at distance 25')
  })

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
