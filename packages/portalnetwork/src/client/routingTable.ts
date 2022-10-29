import { KademliaRoutingTable, NodeId } from '@chainsafe/discv5'
import { Debugger } from 'debug'
export class PortalNetworkRoutingTable extends KademliaRoutingTable {
  public logger?: Debugger
  private radiusMap: Map<NodeId, bigint>
  private gossipMap: Map<NodeId, Set<string>>
  private strikes: Map<NodeId, number>
  private ignored: Set<NodeId>
  constructor(nodeId: NodeId) {
    super(nodeId)
    this.radiusMap = new Map()
    this.gossipMap = new Map()
    this.strikes = new Map()
    this.ignored = new Set()
  }

  public setLogger(logger: Debugger) {
    this.logger = logger.extend('RoutingTable')
  }

  public strike = (nodeId: NodeId) => {
    this.logger?.extend('STRIKE')(nodeId)
    const strikes = this.strikes.get(nodeId) ?? 0
    if (strikes > 1) {
      this.evictNode(nodeId)
      this.strikes.delete(nodeId)
    }
    this.strikes.set(nodeId, strikes + 1)
  }

  public clearStrikes = (nodeId: NodeId) => {
    this.strikes.set(nodeId, 0)
  }

  /**
   *
   * Updates the radius of content a node is interested in
   * @param nodeId - id of node on which to update radius
   * @param radius - radius to be set for node
   */
  public updateRadius = (nodeId: NodeId, radius: bigint) => {
    this.radiusMap.set(nodeId, radius)
  }

  /**
   * Returns the last recorded radius of a peer with the corresponding `nodeId`
   * @param nodeId nodeId of peer for whom radius is sought
   * @returns radius of the peer corresponding to `nodeId`
   */
  public getRadius = (nodeId: NodeId) => {
    return this.radiusMap.get(nodeId)
  }

  /**
   * Checks to see if a contentKey is known by a peer already
   * @param nodeId `nodeId` of peer content was OFFERed to
   * @param contentKey hex prefixed string representation of content key
   * @returns boolean indicating if node has already been OFFERed `contentKey` already
   */
  public contentKeyKnownToPeer = (nodeId: NodeId, contentKey: string) => {
    let gossipList = this.gossipMap.get(nodeId)
    if (!gossipList) {
      // If no gossipList exists, create new one for `nodeId` and add contentKey to it
      gossipList = new Set<string>()
      gossipList.add(contentKey)
      this.gossipMap.set(nodeId, gossipList)
      return false
    }
    const alreadyKnownToPeer = gossipList.has(contentKey)
    if (alreadyKnownToPeer) return true
    else {
      // If contentKey has not been shared with peer, add contentKey to gossipList
      gossipList.add(contentKey)
      this.gossipMap.set(nodeId, gossipList)
      return false
    }
  }

  /**
   * Remove a node from the routing table
   * @param nodeId nodeId of peer to be evicted
   */
  public evictNode = (nodeId: NodeId) => {
    this.logger?.extend('EVICT')(nodeId)
    const enr = this.getValue(nodeId)
    this.radiusMap.delete(nodeId)
    this.gossipMap.delete(nodeId)
    if (enr) {
      this.remove(enr)
    }
  }
}
