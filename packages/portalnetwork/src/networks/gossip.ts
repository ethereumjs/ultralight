import type { BaseNetwork } from './network.js'

import type { ENR } from '@chainsafe/enr'

import { serializedContentKeyToContentId } from '../util/util.js'

type Peer = string

export class GossipManager {
  pulse: number
  network: BaseNetwork
  gossipQueues: Record<Peer, Uint8Array[]>

  constructor(network: BaseNetwork, pulse = 26) {
    this.pulse = pulse
    this.network = network
    this.gossipQueues = {}
  }

  /**
   * @param rate Sets the number of pieces of content that will be offered to each peer (from 1 to 26)
   * @returns The new pulse rate
   */
  public setPulse(rate: number) {
    if (rate > 0 && rate < 27) {
      this.pulse = rate
    }
    return this.pulse
  }

  /**
   * Adds content keys to a given peer's gossip queue
   * @param peer nodeId of a peer to gossip content to
   * @param key content key to be OFFERed
   * @returns the current number of items in a peer's gossip queue
   */
  public enqueue(peer: Peer, key: Uint8Array): number {
    if (this.gossipQueues[peer] === undefined) {
      this.gossipQueues[peer] = []
    }
    if (this.network.routingTable.contentKeyKnownToPeer(peer, key) === false) {
      this.gossipQueues[peer].push(key)
    }
    return this.gossipQueues[peer].length
  }

  /**
   * Offers content from a peer's queue to that peer and clears the queue
   * @param peer nodeId of peer being offered content
   */
  private gossip(peer: ENR) {
    const queue = this.gossipQueues[peer.nodeId]
    this.gossipQueues[peer.nodeId] = []
    void this.network.sendOffer(peer, queue)
  }

  /**
   * Adds new content to the gossip queue of the 5 nearest peers
   * @param serializedKey the Network serialized content key
   */
  public add(serializedKey: Uint8Array): void {
    const id = serializedContentKeyToContentId(serializedKey)
    const peers = this.network.routingTable.nearest(id, 5)
    for (const peer of peers) {
      const size = this.enqueue(peer.nodeId, serializedKey)
      if (size >= this.pulse) {
        this.gossip(peer)
      }
    }
  }
}
