import { distance } from '@chainsafe/discv5'

import { PortalNetworkRoutingTable } from '../../client/routingTable.js'

import type { ENR, NodeId } from '@chainsafe/discv5'

export class StateNetworkRoutingTable extends PortalNetworkRoutingTable {
  /**
   *
   * @param id id of node to find nearest nodes to
   * @param limit maximum number of nodes to return
   * @returns array of `limit` nearest nodes
   */
  nearest(id: NodeId, limit: number): ENR[] {
    const results: ENR[] = []
    for (const bucket of this.buckets) {
      results.push(...bucket.values())
    }
    results.sort((a, b) => {
      const diff = distance(id, a.nodeId) - distance(id, b.nodeId)
      if (diff < 0) return -1
      if (diff === 0n) return 0
      return 1
    })
    return results.slice(0, limit)
  }
}
