import { ENR, distance, NodeId, EntryStatus } from '@chainsafe/discv5'
import { toHexString } from '@chainsafe/ssz'
import { Debugger } from 'debug'
import { PortalNetwork, SubNetworkIds } from '..'
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
  private networkId: SubNetworkIds
  private log: Debugger

  constructor(portal: PortalNetwork, contentKey: Uint8Array, networkId: SubNetworkIds) {
    this.client = portal
    this.lookupPeers = []
    this.contacted = []
    this.contentKey = contentKey
    this.networkId = networkId
    this.contentId = serializedContentKeyToContentId(contentKey)
    this.log = this.client.logger.extend('lookup', ':')
  }

  /**
   * Queries the 5 nearest nodes in the history network routing table and recursively
   * requests peers closer to the content until either the content is found or there are no more peers to query
   * @param contentType contentType sought
   * @param block1Hash hex prefixed string corresponding to blockhash
   */
  public startLookup = async () => {
    const routingTable = this.client.routingTables.get(SubNetworkIds.HistoryNetwork)
    this.client.metrics?.totalContentLookups.inc()
    try {
      const res = await this.client.db.get(this.contentId)
      return res
    } catch {}
    routingTable!.nearest(this.contentId, 5).forEach((peer) => {
      const dist = distance(peer.nodeId, this.contentId)
      this.lookupPeers.push({ nodeId: peer.nodeId, distance: dist })
    })

    let finished = false
    while (!finished) {
      if (this.lookupPeers.length === 0) {
        finished = true
        this.client.metrics?.failedContentLookups.inc()
        return
      }
      const nearestPeer = this.lookupPeers.shift()
      if (!nearestPeer) {
        return
      }

      this.log(`sending FINDCONTENT request to ${shortId(nearestPeer!.nodeId)}`)
      const res = await this.client.sendFindContent(
        nearestPeer.nodeId,
        this.contentKey,
        this.networkId
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
          return res.value
        }
        case 2: {
          // findContent request returned ENRs of nodes closer to content
          this.log(`received ${res.value.length} ENRs for closer nodes`)
          res.value.forEach((enr) => {
            if (!finished) {
              const decodedEnr = ENR.decode(Buffer.from(enr as Uint8Array))
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
    this.contacted.forEach((peer) => {
      if (!peer.hasContent) {
        this.client.sendOffer(peer.nodeId, [this.contentKey], this.networkId)
      }
    })
  }
}
