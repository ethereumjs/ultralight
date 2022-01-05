import { KademliaRoutingTable, NodeId } from '@chainsafe/discv5'

export class PortalNetworkRoutingTable extends KademliaRoutingTable {
  private radiusMap: Map<NodeId, bigint>
  constructor(nodeId: NodeId) {
    super(nodeId)
    this.radiusMap = new Map()
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
   *
   * Delete a node from the `radiusMap`
   * @param nodeId node to be deleted from radius map
   */
  public removeFromRadiusMap = (nodeId: NodeId) => {
    this.radiusMap.delete(nodeId)
  }

  /**
   * Returns the last recorded radius of a peer with the corresponding `nodeId`
   * @param nodeId nodeId of peer for whom radius is sought
   * @returns radius of the peer corresponding to `nodeId`
   */
  public getRadius = (nodeId: NodeId) => {
    return this.radiusMap.get(nodeId)
  }
}
