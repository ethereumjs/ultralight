import { ENR, distance, EntryStatus, log2Distance } from '@chainsafe/discv5'
import { Debugger } from 'debug'
import { PortalNetwork, SubNetworkIds } from '..'

export class NodeLookup {
  private client: PortalNetwork
  private nodeSought: string
  private networkId: SubNetworkIds
  private log: Debugger

  constructor(portal: PortalNetwork, nodeId: string, networkId: SubNetworkIds) {
    this.client = portal
    this.networkId = networkId
    this.nodeSought = nodeId
    this.log = this.client.logger.extend('lookup', ':')
  }

  /**
   * Queries the 5 nearest nodes in a subnetwork's routing table for nodes in the kbucket and recursively
   * requests peers closer to the `nodeSought` until either the node is found or there are no more peers to query
   * @param nodeSought nodeId of node sought in lookup
   * @param networkId `SubNetworkId` of the routing table to be queried
   */
  public startLookup = async () => {
    const routingTable = this.client.routingTables.get(this.networkId)
    const closestPeers = routingTable!.nearest(this.nodeSought, 5)
    const newPeers: ENR[] = []
    let finished = false
    while (!finished) {
      if (closestPeers.length === 0) {
        finished = true
        continue
      }
      const nearestPeer = closestPeers.shift()
      // Calculates log2distance between queried peer and `nodeSought`
      const distanceToSoughtPeer = log2Distance(nearestPeer!.nodeId, this.nodeSought)
      // Request nodes in the given kbucket (i.e. log2distance) on the receiving peer's routing table for the `nodeSought`
      const res = await this.client.sendFindNodes(
        nearestPeer!.nodeId,
        Uint16Array.from([distanceToSoughtPeer]),
        SubNetworkIds.HistoryNetwork
      )

      if (res?.enrs && res.enrs.length > 0) {
        const distanceFromSoughtNodeToQueriedNode = distance(nearestPeer!.nodeId, this.nodeSought)
        res.enrs.forEach((enr) => {
          if (!finished) {
            const decodedEnr = ENR.decode(Buffer.from(enr))
            if (decodedEnr.nodeId === this.nodeSought) {
              // `nodeSought` was found -- add to table and terminate lookup
              finished = true
              routingTable!.insertOrUpdate(decodedEnr, EntryStatus.Connected)
              this.client.sendPing(decodedEnr.nodeId, SubNetworkIds.HistoryNetwork)
            } else if (
              distance(decodedEnr.nodeId, this.nodeSought) < distanceFromSoughtNodeToQueriedNode
            ) {
              // if peer received is closer than peer that sent ENR, add to front of `closestPeers` list
              closestPeers.unshift(decodedEnr)
              // Add newly found peers to list for storing in routing table
              newPeers.push(decodedEnr)
            }
          }
        })
      }
    }
    newPeers.forEach((enr) => {
      // Add all newly found peers to the subnetwork routing table
      routingTable!.insertOrUpdate(enr, EntryStatus.Connected)
      this.client.sendPing(enr.nodeId, SubNetworkIds.HistoryNetwork)
    })
  }
}
