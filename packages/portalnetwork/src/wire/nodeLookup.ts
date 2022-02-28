import { ENR, distance, EntryStatus, log2Distance } from '@chainsafe/discv5'
import { Debugger } from 'debug'
import { PortalNetwork, shortId, SubNetworkIds } from '..'

// This class implements a version of the the lookup algorithm defined in the Kademlia paper
// https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf.

const k = 16 // Kademlia constant for max nodes to be retrieved by `nodeLookup`
const a = 3 // Concurrency parameter defined in Kademlia paper

export class NodeLookup {
  private client: PortalNetwork
  private nodeSought: string
  private networkId: SubNetworkIds
  private log: Debugger

  constructor(portal: PortalNetwork, nodeId: string, networkId: SubNetworkIds) {
    this.client = portal
    this.networkId = networkId
    this.nodeSought = nodeId
    this.log = this.client.logger.extend('nodeLookup', ':')
  }

  /**
   * Queries the `a` nearest nodes in a subnetwork's routing table for nodes in the kbucket and recursively
   * requests peers closer to the `nodeSought` until either the node is found or there are no more peers to query
   * @param nodeSought nodeId of node sought in lookup
   * @param networkId `SubNetworkId` of the routing table to be queried
   */
  public startLookup = async () => {
    this.log(`starting lookup for ${shortId(this.nodeSought)}`)
    const routingTable = this.client.routingTables.get(this.networkId)
    const closestPeers = routingTable!.nearest(this.nodeSought, a)
    const newPeers: ENR[] = []
    let finished = false
    while (!finished && newPeers.length <= k) {
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
        this.networkId
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
              this.client.sendPing(decodedEnr.nodeId, this.networkId)
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
    this.log(
      `finished node lookup for ${shortId(this.nodeSought)} and found ${newPeers.length} new peers`
    )
    newPeers.forEach(async (enr) => {
      // Add all newly found peers to the subnetwork routing table
      const res = await this.client.sendPing(enr.nodeId, this.networkId)
      if (res) routingTable!.insertOrUpdate(enr, EntryStatus.Connected)
    })
  }
}
