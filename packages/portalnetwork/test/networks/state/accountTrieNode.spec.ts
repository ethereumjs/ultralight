import { SignableENR } from '@chainsafe/enr'
import { bytesToUnprefixedHex, hexToBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { assert, describe, expect, it } from 'vitest'

import {
  AccountTrieNodeContentKey,
  AccountTrieNodeOffer,
  NetworkId,
  PortalNetwork,
  StateNetworkContentId,
  distance,
  fromHexString,
} from '../../../src/index.js'

import samples from './testdata/accountNodeSamples.json'

import type { StateNetwork } from '../../../src/index.js'

describe('samples', () => {
  const _samples = samples as [string, object][]
  for (const [key, value] of _samples) {
    const contentBytes = Uint8Array.from(Object.values(value))
    const contentKeyBytes = fromHexString(key)
    const contentKey = AccountTrieNodeContentKey.decode(contentKeyBytes)
    it('should decode sample key', () => {
      expect(contentKey.path).toBeDefined()
      expect(contentKey.nodeHash).toBeDefined()
    })

    const content = AccountTrieNodeOffer.deserialize(contentBytes)
    it('should decode content', () => {
      expect(content.proof).toBeDefined()
      expect(content.blockHash).toBeDefined()
    })
  }
})

describe('StateNetwork AccountTrieNode Gossip', async () => {
  const privateKey = hexToBytes(
    '0x0ec9a107bcf64e1213128fe9ede9a148ccf77c6e952ab87eed845df9091207f3',
  )
  const config = {
    enr: SignableENR.decodeTxt(
      'enr:-IS4QIlbUdmqYYXh1Ga17owfX75adT0wftLk9iQNkpftJg9yDjTa4p9mGNmNSYyxIgrWPLg8gNUoSDCZPE3TSOT6SLsDgmlkgnY0gmlwhH8AAAGJc2VjcDI1NmsxoQP0sUfmk0sj-uUuy08uM9bqpqmed0thhKXSzmJBOZPXNoN1ZHCCE4g',
      privateKey,
    ),
    r: 254,
  }
  const client = await PortalNetwork.create({
    bindAddress: '127.0.0.1',
    supportedNetworks: [{ networkId: NetworkId.StateNetwork }],
    config: {
      enr: config.enr,
      privateKey: keys.privateKeyFromRaw(config.enr.privateKey),
    },
  })
  const state = client.networks.get(NetworkId.StateNetwork) as StateNetwork
  const sample = samples.slice(-1)[0]
  const [key, value] = sample as [string, object]
  const contentBytes = Uint8Array.from(Object.values(value))
  const contentKeyBytes = fromHexString(key)
  const contentKey = AccountTrieNodeContentKey.decode(contentKeyBytes)
  const content = AccountTrieNodeOffer.deserialize(contentBytes)
  const { path } = contentKey
  const { proof } = content
  const { interested, notInterested } = await state.storeInterestedNodes(path, proof)

  it('Should store interested content', async () => {
    expect(interested.length).toBeGreaterThan(0)
    expect(proof.length - interested.length).toEqual(notInterested.length)
    for (const { contentKey } of interested) {
      const id = StateNetworkContentId.fromBytes(contentKey)
      const dist = distance(client.discv5.enr.nodeId, bytesToUnprefixedHex(id))
      expect(dist).toBeLessThan(state.nodeRadius)
    }
    for (const { contentKey } of notInterested) {
      const id = StateNetworkContentId.fromBytes(contentKey)
      const dist = distance(client.discv5.enr.nodeId, bytesToUnprefixedHex(id))
      expect(dist).toBeGreaterThan(state.nodeRadius)
    }
  })
  it(`should find (${interested.length}) interested contents in db`, async () => {
    for (const { contentKey, dbContent } of interested) {
      const content = await state.findContentLocally(contentKey)
      expect(content).toBeDefined()
      assert.deepEqual(content, dbContent)
    }
  })
})
