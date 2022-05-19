import { NodeId } from '@chainsafe/discv5'
import { PortalNetworkRoutingTable } from '../client'
import { PortalNetworkMetrics } from '../client/types'
import { StateNetworkRoutingTable } from './state'
export abstract class Protocol {
  public routingTable: PortalNetworkRoutingTable | StateNetworkRoutingTable
  private metrics: PortalNetworkMetrics | undefined
  constructor(nodeId: NodeId, metrics?: PortalNetworkMetrics) {
    this.routingTable = new PortalNetworkRoutingTable(nodeId)
    this.metrics = metrics
  }
}
