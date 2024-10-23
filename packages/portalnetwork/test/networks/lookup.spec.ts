import debug from 'debug'
import { assert, describe, it } from 'vitest'

import { PortalNetwork } from '../../src/client/index.js'
import { BaseNetwork, ContentLookup } from '../../src/networks/index.js'

import type { NodeId } from '@chainsafe/enr'

type LookupPeer = {
  nodeId: NodeId
  distance: number
}

const peers: LookupPeer[] = [
  { nodeId: '0x1', distance: 1 },
  { nodeId: '0x2', distance: 2 },
  { nodeId: '0x3', distance: 3 },
  { nodeId: '0x4', distance: 4 },
  { nodeId: '0x5', distance: 5 },
  { nodeId: '0x6', distance: 6 },
  { nodeId: '0x7', distance: 7 },
  { nodeId: '0x8', distance: 8 },
  { nodeId: '0x9', distance: 9 },
  { nodeId: '0x10', distance: 10 },
]

describe('Custom Peer Heap', () => {
  const portal = PortalNetwork.prototype
  portal.utpTimout = 1000
  const network = BaseNetwork.prototype
  network.logger = debug('test')
  network.portal = portal
  const lookup = new ContentLookup(BaseNetwork.prototype, Uint8Array.from([]))

  it('should be empty', () => {
    assert.isUndefined(lookup['lookupPeers'].peek())
    assert.isUndefined(lookup['lookupPeers'].pop())
    assert.equal(lookup['lookupPeers'].size(), 0)
  })

  it('should have one element', () => {
    lookup['lookupPeers'].push(peers[0])
    assert.equal(lookup['lookupPeers'].size(), 1)
    assert.deepEqual(lookup['lookupPeers'].peek(), peers[0])
  })

  it('should sort elements', () => {
    lookup['lookupPeers'].push(peers[3], peers[1], peers[2])
    assert.equal(lookup['lookupPeers'].size(), 4)
    assert.deepEqual(lookup['lookupPeers'].peek(), peers[0])
    assert.deepEqual(lookup['lookupPeers'].pop(), peers[0])
    assert.equal(lookup['lookupPeers'].size(), 3)
    assert.deepEqual(lookup['lookupPeers'].peek(), peers[1])
  })
  it('should return top X elements', () => {
    lookup['lookupPeers'].push(peers[4], peers[9], peers[5], peers[8], peers[6], peers[7])
    assert.equal(lookup['lookupPeers'].size(), 9)
    const top5: LookupPeer[] = []
    while (lookup['lookupPeers'].peek() && top5.length < 5) {
      top5.push(lookup['lookupPeers'].pop()!)
    }
    assert.equal(top5.length, 5)
    assert.equal(lookup['lookupPeers'].size(), 4)
    assert.deepEqual(top5, peers.slice(1, 6))
  })
})
