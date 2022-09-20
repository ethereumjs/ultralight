import { fromHexString, toHexString } from '@chainsafe/ssz'
import { HistoryProtocol } from './history.js'
import { HistoryNetworkContentKeyUnionType, HistoryNetworkContentTypes } from './types.js'
import { getHistoryNetworkContentId } from './util.js'

type Peer = string

export class GossipManager {
  pulse: number
  history: HistoryProtocol
  gossipQueues: Record<Peer, Uint8Array[]>

  constructor(history: HistoryProtocol) {
    this.pulse = 26
    this.history = history
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
  private enqueue(peer: Peer, key: Uint8Array): number {
    if (!this.history.routingTable.contentKeyKnownToPeer(peer, toHexString(key))) {
      this.gossipQueues[peer]
        ? this.gossipQueues[peer].push(key)
        : (this.gossipQueues[peer] = [key])
    }
    return this.gossipQueues[peer].length
  }

  /**
   * Offers content from a peer's queue to that peer and clears the queue
   * @param peer nodeId of peer being offered content
   */
  private gossip(peer: Peer) {
    const queue = this.gossipQueues[peer]
    this.gossipQueues[peer] = []
    this.history.sendOffer(peer, queue)
  }

  /**
   * Adds new content to the gossip queue of the 5 nearest peers
   * @param hash blockHash or epochHash
   * @param contentType
   */
  public add(hash: string, contentType: HistoryNetworkContentTypes): void {
    const id = getHistoryNetworkContentId(contentType, hash)
    const key = HistoryNetworkContentKeyUnionType.serialize({
      selector: contentType,
      value: {
        blockHash: fromHexString(hash),
      },
    })
    const peers = this.history.routingTable.nearest(id, 5)
    for (const peer of peers) {
      const size = this.enqueue(peer.nodeId, key)
      if (size >= this.pulse) {
        this.gossip(peer.nodeId)
      }
    }
  }
}
