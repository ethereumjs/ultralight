import { ENR, KademliaRoutingTable, NodeId } from '@chainsafe/discv5'
import { Debugger } from 'debug'
export class PortalNetworkRoutingTable extends KademliaRoutingTable {
  public logger?: Debugger
  private radiusMap: Map<NodeId, bigint>
  private gossipMap: Map<NodeId, Set<string>>
  public strikes: Map<NodeId, number>
  private ignored: [number, NodeId][]
  constructor(nodeId: NodeId) {
    super(nodeId)
    this.radiusMap = new Map()
    this.gossipMap = new Map()
    this.strikes = new Map()
    this.ignored = []
  }

  public setLogger(logger: Debugger) {
    this.logger = logger.extend('RoutingTable')
  }

  public strike = (nodeId: NodeId) => {
    let strikes = this.strikes.get(nodeId) ?? 0
    strikes++
    this.logger?.extend('STRIKE').extend(strikes.toString())(nodeId)
    if (strikes > 2) {
      this.evictNode(nodeId)
      return
    }
    this.strikes.set(nodeId, strikes)
    return strikes
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
   * Evict a node from the routing table and ignore
   * @param nodeId nodeId of peer to be evicted
   */
  public evictNode = (nodeId: NodeId) => {
    this.logger?.extend('EVICT')(nodeId)
    let enr: ENR | undefined = this.getValue(nodeId)
    this.ignoreNode(nodeId)
    if (enr) {
      enr = this.removeById(nodeId)?.value
    }
    if (enr) {
      enr = this.remove(enr)?.value
    }
    this.radiusMap.delete(nodeId)
    this.gossipMap.delete(nodeId)
    this.strikes.delete(nodeId)
  }

  // Add node to ignored list for 2 minutes and then delete from ignored list

  private ignoreNode = (nodeId: NodeId) => {
    this.ignored.push([Date.now(), nodeId])
  }

  // Method for Protocol to check if Peer should be ignored.
  // Mainly prevents self from continuing to PING dead enrs that we receive

  public isIgnored = (nodeId: string) => {
    if (this.ignored.find(([t, n]) => n === nodeId)) {
      return true
    }
  }

  public clearIgnored() {
    const before = this.ignored.length
    const splitIndex = this.ignored.findIndex((entry) => entry[0] > Date.now() - 120000)
    this.ignored = this.ignored.slice(splitIndex)
    before - this.ignored.length > 0 &&
      this.logger!(`${before - this.ignored.length} nodeId's are no longer ignored`)
  }
}
