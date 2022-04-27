import { ENR, distance, NodeId, EntryStatus } from '@chainsafe/discv5'
import { toHexString } from '@chainsafe/ssz'
import { Debugger } from 'debug'
import { PortalNetwork, SubprotocolIds } from '..'
import { serializedContentKeyToContentId, shortId } from '../util'

type lookupPeer = {
  nodeId: NodeId
  distance: bigint
  hasContent?: boolean
}

export class ContentLookup {
  private client: PortalNetwork
  private lookupPeers: lookupPeer[]
  private contacted: lookupPeer[]
  private contentId: string
  private contentKey: Uint8Array
  private protocolId: SubprotocolIds
  private log: Debugger

  constructor(portal: PortalNetwork, contentKey: Uint8Array, protocolId: SubprotocolIds) {
    this.client = portal
    this.lookupPeers = []
    this.contacted = []
    this.contentKey = contentKey
    this.protocolId = protocolId
    this.contentId = serializedContentKeyToContentId(contentKey)
    this.log = this.client.logger.extend('lookup', ':')
  }

  /**
   * Queries the 5 nearest nodes in the history network routing table and recursively
   * requests peers closer to the content until either the content is found or there are no more peers to query
   */
  public startLookup = async () => {
    const routingTable = this.client.routingTables.get(SubprotocolIds.HistoryNetwork)
    this.client.metrics?.totalContentLookups.inc()
    try {
      const res = await this.client.db.get(this.contentId)
      return res
      //eslint-disable-next-line
    } catch { }
    routingTable!.nearest(this.contentId, 5).forEach((peer) => {
      const dist = distance(peer.nodeId, this.contentId)
      this.lookupPeers.push({ nodeId: peer.nodeId, distance: dist })
    })

    let finished = false
    const nodesAlreadyAsked = new Set()
    while (!finished) {
      if (this.lookupPeers.length === 0) {
        finished = true
        this.client.metrics?.failedContentLookups.inc()
        this.client.logger(`failed to retrieve ${this.contentKey} from network`)
        return
      }
      const nearestPeer = this.lookupPeers.shift()
      if (!nearestPeer) {
        return
      }
      if (nodesAlreadyAsked.has(nearestPeer.nodeId)) {
        continue
      } else {
        nodesAlreadyAsked.add(nearestPeer.nodeId)
      }

      this.log(`sending FINDCONTENT request to ${shortId(nearestPeer!.nodeId)}`)
      const res = await this.client.sendFindContent(
        nearestPeer.nodeId,
        this.contentKey,
        this.protocolId
      )
      if (!res) {
        // Node didn't respond
        continue
      }
      switch (res.selector) {
        case 0: {
          // findContent returned uTP connection ID
          this.log(`received uTP connection ID from ${shortId(nearestPeer!.nodeId)}`)
          finished = true
          nearestPeer.hasContent = true
          return res.value
        }
        case 1: {
          // findContent returned data sought
          this.log(`received content corresponding to ${shortId(toHexString(this.contentKey))}`)
          finished = true
          nearestPeer.hasContent = true
          this.client.metrics?.successfulContentLookups.inc()
          // Offer content to neighbors who should have had content but don't if we receive content directly
          this.contacted.forEach((peer) => {
            if (!peer.hasContent) {
              const routingTable = this.client.routingTables.get(this.protocolId)!
              if (!routingTable.contentKeyKnownToPeer(peer.nodeId, toHexString(this.contentKey))) {
                // Only offer content if not already offered to this peer
                this.client.sendOffer(peer.nodeId, [this.contentKey], this.protocolId)
              }
            }
          })
          return res.value
        }
        case 2: {
          // findContent request returned ENRs of nodes closer to content
          this.log(`received ${res.value.length} ENRs for closer nodes`)
          res.value.forEach((enr) => {
            if (!finished) {
              const decodedEnr = ENR.decode(Buffer.from(enr as Uint8Array))
              if (nodesAlreadyAsked.has(decodedEnr.nodeId)) {
                return
              }
              const dist = distance(decodedEnr.nodeId, this.contentId)
              if (this.lookupPeers.length === 0) {
                // if no peers currently in lookup table, add to beginning of list
                this.lookupPeers.push({ nodeId: decodedEnr.nodeId, distance: dist })
              } else {
                const index = this.lookupPeers.findIndex((peer) => peer.distance > dist)
                if (index > -1) {
                  // add peer to lookupPeer list if distance from content is less than at least one current lookupPeer
                  this.lookupPeers.splice(index - 1, 0, {
                    nodeId: decodedEnr.nodeId,
                    distance: dist,
                  })
                } else {
                  // if distance to content is greater than all other peers, add to end of lookupPeer list
                  this.lookupPeers.push({ nodeId: decodedEnr.nodeId, distance: dist })
                }
              }
              if (!routingTable!.getValue(decodedEnr.nodeId)) {
                routingTable!.insertOrUpdate(decodedEnr, EntryStatus.Connected)
              }
            }
          })
        }
      }
      this.contacted.push(nearestPeer!)
    }
  }
}
