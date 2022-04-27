import { ENR, distance, EntryStatus, log2Distance } from '@chainsafe/discv5'
import { Debugger } from 'debug'
import { PortalNetwork, shortId, SubprotocolIds } from '..'

// This class implements a version of the the lookup algorithm defined in the Kademlia paper
// https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf.

const k = 16 // Kademlia constant for max nodes to be retrieved by `nodeLookup`
const a = 3 // Concurrency parameter defined in Kademlia paper

export class NodeLookup {
  private client: PortalNetwork
  private nodeSought: string
  private protocolId: SubprotocolIds
  private log: Debugger

  constructor(portal: PortalNetwork, nodeId: string, protocolId: SubprotocolIds) {
    this.client = portal
    this.protocolId = protocolId
    this.nodeSought = nodeId
    this.log = this.client.logger.extend('nodeLookup', ':')
  }

  /**
   * Queries the `a` nearest nodes in a subprotocol's routing table for nodes in the kbucket and recursively
   * requests peers closer to the `nodeSought` until either the node is found or there are no more peers to query
   * @param nodeSought nodeId of node sought in lookup
   * @param protocolId `SubNetworkId` of the routing table to be queried
   */
  public startLookup = async () => {
    this.log(`starting lookup for ${shortId(this.nodeSought)}`)
    const routingTable = this.client.routingTables.get(this.protocolId)
    const closestPeers = routingTable!.nearest(this.nodeSought, a)
    const newPeers: ENR[] = []
    const nodesAlreadyAsked = new Set()

    let finished = false
    while (!finished && newPeers.length <= k) {
      if (closestPeers.length === 0) {
        finished = true
        continue
      }
      const nearestPeer = closestPeers.shift()
      if (nodesAlreadyAsked.has(nearestPeer?.nodeId)) {
        continue
      } else {
        nodesAlreadyAsked.add(nearestPeer?.nodeId)
      }

      // Calculates log2distance between queried peer and `nodeSought`
      const distanceToSoughtPeer = log2Distance(nearestPeer!.nodeId, this.nodeSought)
      // Request nodes in the given kbucket (i.e. log2distance) on the receiving peer's routing table for the `nodeSought`
      const res = await this.client.sendFindNodes(
        nearestPeer!.nodeId,
        [distanceToSoughtPeer],
        this.protocolId
      )

      if (res?.enrs && res.enrs.length > 0) {
        const distanceFromSoughtNodeToQueriedNode = distance(nearestPeer!.nodeId, this.nodeSought)
        res.enrs.forEach((enr) => {
          if (!finished) {
            const decodedEnr = ENR.decode(Buffer.from(enr))
            if (nodesAlreadyAsked.has(decodedEnr.nodeId)) {
              return
            }
            if (decodedEnr.nodeId === this.nodeSought) {
              // `nodeSought` was found -- add to table and terminate lookup
              finished = true
              routingTable!.insertOrUpdate(decodedEnr, EntryStatus.Connected)
              this.client.sendPing(decodedEnr.nodeId, this.protocolId)
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
      // Add all newly found peers to the subprotocol routing table
      const res = await this.client.sendPing(enr.nodeId, this.protocolId)
      if (res) routingTable!.insertOrUpdate(enr, EntryStatus.Connected)
    })
  }
}
