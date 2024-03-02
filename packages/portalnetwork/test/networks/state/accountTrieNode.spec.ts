import { KeypairType, SignableENR, createKeypair } from '@chainsafe/discv5'
import { bytesToHex } from '@ethereumjs/util'
import { peerIdFromString } from '@libp2p/peer-id'
import { describe, expect, it } from 'vitest'

import {
  AccountTrieNodeContentKey,
  AccountTrieNodeOffer,
  NetworkId,
  PortalNetwork,
  StateNetworkContentId,
  distance,
  fromHexString,
  nextOffer,
  toHexString,
  unpackNibbles,
} from '../../../src/index.js'

import samples from './testdata/accountNodeSamples.json'

import type { StateNetwork } from '../../../src/index.js'

const keypair = createKeypair(
  KeypairType.Secp256k1,
  Buffer.from('0ec9a107bcf64e1213128fe9ede9a148ccf77c6e952ab87eed845df9091207f3', 'hex'),
  Buffer.from('03f4b147e6934b23fae52ecb4f2e33d6eaa6a99e774b6184a5d2ce62413993d736', 'hex'),
)
const config = {
  keypair,
  enr: SignableENR.decodeTxt(
    'enr:-IS4QIlbUdmqYYXh1Ga17owfX75adT0wftLk9iQNkpftJg9yDjTa4p9mGNmNSYyxIgrWPLg8gNUoSDCZPE3TSOT6SLsDgmlkgnY0gmlwhH8AAAGJc2VjcDI1NmsxoQP0sUfmk0sj-uUuy08uM9bqpqmed0thhKXSzmJBOZPXNoN1ZHCCE4g',
    keypair,
  ),
  peerId: peerIdFromString('16Uiu2HAmV8Acjks2Y9wQ4nXFRsMMaZQ4r4i7dzKcnurYrwtg35zV'),
  r: 254,
}

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
  const client = await PortalNetwork.create({
    supportedNetworks: [NetworkId.StateNetwork],
    radius: BigInt(2 ** config.r),
    config: {
      enr: config.enr,
      peerId: config.peerId,
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
  const unpacked = unpackNibbles(path)
  const { proof, blockHash } = content
  const { interested, notInterested } = await state.storeInterestedNodes(path, proof)
  it('Should store interested content', async () => {
    expect(interested.length).toBeGreaterThan(0)
    expect(proof.length - interested.length).toEqual(notInterested.length)
    for (const { contentKey } of interested) {
      const id = StateNetworkContentId.fromBytes(contentKey)
      const dist = distance(client.discv5.enr.nodeId, bytesToHex(id).slice(2))
      expect(dist).toBeLessThan(state.nodeRadius)
    }
    for (const { contentKey } of notInterested) {
      const id = StateNetworkContentId.fromBytes(contentKey)
      const dist = distance(client.discv5.enr.nodeId, bytesToHex(id).slice(2))
      expect(dist).toBeGreaterThan(state.nodeRadius)
    }
  })
  it(`should find (${interested.length}) interested contents in db`, async () => {
    for (const { contentKey, dbContent } of interested) {
      const content = await state.stateDB.getContent(contentKey)
      expect(content).toBeDefined()
      expect(content).toEqual(toHexString(dbContent))
    }
  })
  it(`should create higher level offer`, async () => {
    const next = await nextOffer(path, proof)
    expect(next.nodes.length).toEqual(proof.length - 1)
    expect(next.newpaths.length).toBeLessThan(unpacked.length)
  })
  it(`should package forward offer for gossip`, async () => {
    const forwardOffer = await state.forwardAccountTrieOffer(path, proof, blockHash)
    const decoded = AccountTrieNodeContentKey.decode(forwardOffer.contentKey)
    expect(decoded.path.length).toBeLessThanOrEqual(path.length)
  })
})
