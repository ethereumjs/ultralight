import tape from 'tape'
import {
  shortId,
  generateRandomNodeIdAtDistance,
  arrayByteLength,
  dirSize,
} from '../../src/util/index.js'
import { log2Distance } from '@chainsafe/discv5'
tape('utility method tests', async (t) => {
  const nodeId = '82418605a77ea8c8f47802d71661d3812ff64e70fd2fc5f0ff57a113185b2c41'

  const short = shortId(nodeId)
  t.ok(short === '82418...b2c41', 'correctly shortened node id')

  let randomNodeId = generateRandomNodeIdAtDistance(nodeId, 255)
  t.ok(log2Distance(nodeId, randomNodeId) === 255, 'calculated random node ID at distance 255')
  randomNodeId = generateRandomNodeIdAtDistance(nodeId, 25)
  t.ok(log2Distance(nodeId, randomNodeId) === 25, 'calculated random node id at distance 25')

  const arrayOfUint8Arrays = [Uint8Array.from([1, 2, 3]), Uint8Array.from([1, 2])]
  const arrayOfBuffers = [Buffer.from([1, 2, 3]), Buffer.from([1, 2, 3, 4, 5])]
  t.equal(arrayByteLength(arrayOfUint8Arrays), 5, 'computed correct length of nested Uint8Arrays')
  t.equal(arrayByteLength(arrayOfBuffers), 8, 'computed correct length of nested Buffers')
  t.equal(await dirSize('./test/util/testDir'), 0.00002765655517578125)

  t.end()
})
