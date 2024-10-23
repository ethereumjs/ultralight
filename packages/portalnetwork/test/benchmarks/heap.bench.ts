import { Heap } from 'heap-js'
import { bench, describe } from 'vitest'

import type { NodeId } from '@chainsafe/enr'
type LookupPeer = {
  nodeId: NodeId
  distance: number
}

const peers: LookupPeer[] = [
  { nodeId: '0x5', distance: 5 },
  { nodeId: '0x1', distance: 1 },
  { nodeId: '0x6', distance: 6 },
  { nodeId: '0x3', distance: 3 },
  { nodeId: '0x4', distance: 4 },
  { nodeId: '0x7', distance: 7 },
  { nodeId: '0x8', distance: 8 },
  { nodeId: '0x9', distance: 9 },
  { nodeId: '0x10', distance: 10 },
  { nodeId: '0x2', distance: 2 },
]

const arraySort = (peers: LookupPeer[]) =>
  peers.sort((a, b) => Number(a.distance) - Number(b.distance))

describe('inserting benchmarks', () => {
  const heap = new Heap<LookupPeer>()
  bench('heaping 10 peers', () => {
    for (const peer of peers) {
      heap.push(peer)
    }
  })
  const sorted: LookupPeer[] = []
  bench('arraying 10 peers', () => {
    for (const peer of peers) {
      sorted.push(peer)
    }
    arraySort(sorted)
  })
})
