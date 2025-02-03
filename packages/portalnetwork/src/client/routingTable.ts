import { KademliaRoutingTable } from '@chainsafe/discv5'

import type { ENR, NodeId } from '@chainsafe/enr'
import type { Debugger } from 'debug'
import type { IClientInfo, INodeAddress } from '../index.js'
import { shortId } from '../index.js'
import { ScoredPeer } from '../networks/peers.js'
export class PortalNetworkRoutingTable extends KademliaRoutingTable {
  public logger?: Debugger
  private radiusMap: Map<NodeId, bigint>
  private gossipMap: Map<NodeId, Set<Uint8Array>>
  private ignored: [number, NodeId][]
  /**
   * Map of all known peers in the network
   */
  private networkCensus: Map<string, ScoredPeer>
  constructor(nodeId: NodeId) {
    super(nodeId)
    this.radiusMap = new Map()
    this.gossipMap = new Map()
    this.ignored = []
    this.networkCensus = new Map()
  }

  public setLogger(logger: Debugger) {
    this.logger = logger.extend('RoutingTable')
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
   * Returns true if content has been OFFERed to a peer and updates the OFFERed list for
   * that peer if not
   * @param nodeId `nodeId` of peer content was OFFERed to
   * @param contentKey hex prefixed string representation of content key
   * @returns boolean indicating if node has previously been OFFERed `contentKey` already
   */
  public contentKeyKnownToPeer = (nodeId: NodeId, contentKey: Uint8Array) => {
    const gossipList = this.gossipMap.get(nodeId)
    if (gossipList !== undefined) {
      const alreadyKnownToPeer = gossipList.has(contentKey)
      if (alreadyKnownToPeer) return true
    }
    return false
  }

  public markContentKeyAsKnownToPeer = (nodeId: NodeId, contentKey: Uint8Array) => {
    let gossipList = this.gossipMap.get(nodeId)
    if (!gossipList) {
      gossipList = new Set<Uint8Array>()
      this.gossipMap.set(nodeId, gossipList)
    }
    gossipList.add(contentKey)
  }

  /**
   * Evict a node from the routing table and ignore
   * @param nodeId nodeId of peer to be evicted
   */
  public evictNode = (nodeId: NodeId) => {
    this.logger?.extend('EVICT')(shortId(nodeId))
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
  }

  // Add node to ignored list for 2 minutes and then delete from ignored list

  private ignoreNode = (nodeId: NodeId) => {
    this.ignored.push([Date.now(), nodeId])
  }

  // Method for Network to check if Peer should be ignored.
  // Mainly prevents self from continuing to PING dead enrs that we receive

  public isIgnored = (nodeId: string) => {
    if (this.ignored.find(([_t, n]) => n === nodeId)) {
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

  public nodeInCensus = (nodeId: NodeId) => {
    return this.networkCensus.has(nodeId)
  }

  public updateNodeFromPing = (
    nodeAddress: INodeAddress,
    {
      capabilities,
      clientInfo,
      radius,
    }: {
      radius: bigint
      capabilities?: number[]
      clientInfo?: IClientInfo
    },
  ) => {
    this.updateCensusFromNodeAddress(nodeAddress)
    this.updateRadius(nodeAddress.nodeId, radius)
    const peer = this.networkCensus.get(nodeAddress.nodeId)!
    peer.radius = radius
    if (capabilities !== undefined) {
      peer.capabilities = capabilities
    }
    if (clientInfo !== undefined) {
      peer.clientInfo = clientInfo
    }
  }

  public updateNodeFromPong = (
    enr: ENR,
    {
      capabilities,
      clientInfo,
      radius,
    }: {
      radius: bigint
      capabilities?: number[]
      clientInfo?: IClientInfo
    },
  ) => {
    this.updateCensusFromENR(enr)
    this.updateRadius(enr.nodeId, radius)
    const peer = this.networkCensus.get(enr.nodeId)!  
    peer.enr = enr
    peer.radius = radius
    if (capabilities !== undefined) {
      peer.capabilities = capabilities
    }
    if (clientInfo !== undefined) {
      peer.clientInfo = clientInfo
    }
  
  }

  public updateCensusFromENR = (enr: ENR) => {
    const peer = this.networkCensus.get(enr.nodeId)
    if (peer) {
      peer.enr = enr
    } else {
      const nodeAddress: INodeAddress = {
        nodeId: enr.nodeId,
        socketAddr: enr.getLocationMultiaddr('udp')!,
      }
      this.networkCensus.set(enr.nodeId, new ScoredPeer({ nodeAddress, enr }))
    }
  }

  public updateCensusFromNodeAddress = (nodeAddress: INodeAddress) => {
    const peer = this.networkCensus.get(nodeAddress.nodeId)
    if (peer) {
      peer.nodeAddress = nodeAddress
    } else {
      this.networkCensus.set(nodeAddress.nodeId, new ScoredPeer({ nodeAddress }))
    }
  }
}
