import { fromHexString, toHexString } from '@chainsafe/ssz'
import { HistoryProtocol } from './history.js'
import { HistoryNetworkContentKeyUnionType, HistoryNetworkContentTypes } from './types.js'
import { getHistoryNetworkContentId } from './util.js'

type Peer = string

export default class GossipManager {
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

  private enqueue(peer: Peer, key: Uint8Array): number {
    if (!this.history.routingTable.contentKeyKnownToPeer(peer, toHexString(key))) {
      this.gossipQueues[peer]
        ? this.gossipQueues[peer].push(key)
        : (this.gossipQueues[peer] = [key])
    }
    return this.gossipQueues[peer].length
  }

  private clearQueue(peer: Peer) {
    this.gossipQueues[peer] = []
  }

  private queue(peer: Peer) {
    return this.gossipQueues[peer]
  }

  private gossip(peer: Peer) {
    const queue = this.queue(peer)
    this.clearQueue(peer)
    this.history.sendOffer(peer, queue)
  }

  /**
   * Adds new content to the gossip queue of the 5 nearest peers
   * @param hash blockHash or epochHash
   * @param contentType
   */
  public add(hash: string, contentType: HistoryNetworkContentTypes): void {
    const id = getHistoryNetworkContentId(1, contentType, hash)
    const key = HistoryNetworkContentKeyUnionType.serialize({
      selector: contentType,
      value: {
        chainId: 1,
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
