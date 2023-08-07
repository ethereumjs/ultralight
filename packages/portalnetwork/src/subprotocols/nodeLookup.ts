import { ENR, distance, EntryStatus, log2Distance } from '@chainsafe/discv5'
import { Debugger } from 'debug'
import { shortId } from '../index.js'
import { BaseProtocol } from './protocol.js'

// This class implements a version of the the lookup algorithm defined in the Kademlia paper
// https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf.

const k = 16 // Kademlia constant for max nodes to be retrieved by `nodeLookup`
const a = 3 // Concurrency parameter defined in Kademlia paper

export class NodeLookup {
  private protocol: BaseProtocol
  private nodeSought: string
  private log: Debugger

  constructor(protocol: BaseProtocol, nodeId: string) {
    this.protocol = protocol
    this.nodeSought = nodeId
    this.log = this.protocol.logger.extend('nodeLookup', ':')
  }

  /**
   * Queries the `a` nearest nodes in a subprotocol's routing table for nodes in the kbucket and recursively
   * requests peers closer to the `nodeSought` until either the node is found or there are no more peers to query
   * @param nodeSought nodeId of node sought in lookup
   * @param protocolId `SubNetworkId` of the routing table to be queried
   */
  public startLookup = async (): Promise<undefined | string> => {
    const closestPeers = this.protocol.routingTable.nearest(this.nodeSought, a)
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
      const res = await this.protocol.sendFindNodes(nearestPeer!.nodeId, [distanceToSoughtPeer])

      if (res?.enrs && res.enrs.length > 0) {
        const distanceFromSoughtNodeToQueriedNode = distance(nearestPeer!.nodeId, this.nodeSought)
        for await (const enr of res.enrs) {
          if (!finished) {
            const decodedEnr = ENR.decode(Buffer.from(enr))
            if (nodesAlreadyAsked.has(decodedEnr.nodeId)) {
              return
            }
            if (decodedEnr.nodeId === this.nodeSought) {
              // `nodeSought` was found -- add to table and terminate lookup
              finished = true
              this.protocol.routingTable.insertOrUpdate(decodedEnr, EntryStatus.Connected)
              await this.protocol.sendPing(decodedEnr)
            } else if (
              distance(decodedEnr.nodeId, this.nodeSought) < distanceFromSoughtNodeToQueriedNode
            ) {
              // if peer received is closer than peer that sent ENR, add to front of `closestPeers` list
              closestPeers.unshift(decodedEnr)
              // Add newly found peers to list for storing in routing table
              newPeers.push(decodedEnr)
            }
          }
        }
      }
    }
    newPeers.length > 0 &&
      this.log(
        `finished node lookup for ${shortId(this.nodeSought)} and found ${
          newPeers.length
        } new peers`
      )
    for await (const enr of newPeers) {
      // Add all newly found peers to the subprotocol routing table
      const res = await this.protocol.sendPing(enr)
      if (res) this.protocol.routingTable.insertOrUpdate(enr, EntryStatus.Connected)
    }
    return this.protocol.routingTable.getWithPending(this.nodeSought)?.value.encodeTxt()
  }
}
