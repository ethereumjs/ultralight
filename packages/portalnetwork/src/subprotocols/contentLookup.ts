import { ENR, distance, NodeId, EntryStatus } from '@chainsafe/discv5'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Debugger } from 'debug'
import { serializedContentKeyToContentId, shortId } from '../util/index.js'
import { HistoryNetworkContentTypes } from './history/types.js'
import { BaseProtocol } from './protocol.js'

type lookupPeer = {
  nodeId: NodeId
  distance: bigint
  hasContent?: boolean
}

export class ContentLookup {
  private protocol: BaseProtocol
  private lookupPeers: lookupPeer[]
  private contacted: NodeId[]
  private contentId: string
  private contentKey: Uint8Array
  private logger: Debugger
  private uTPlistener: any

  constructor(protocol: BaseProtocol, contentKey: Uint8Array) {
    this.protocol = protocol
    this.lookupPeers = []
    this.contacted = []
    this.contentKey = contentKey
    this.contentId = serializedContentKeyToContentId(contentKey)
    this.logger = this.protocol.client.logger.extend('lookup')
  }

  /**
   * Queries the 5 nearest nodes in the history network routing table and recursively
   * requests peers closer to the content until either the content is found or there are no more peers to query
   */
  public startLookup = async (): Promise<Uint8Array | Uint8Array[] | undefined> => {
    // Don't support content lookups for protocols that don't implement it (i.e. Canonical Indices)
    if (!this.protocol.sendFindContent) return
    this.protocol.client.metrics?.totalContentLookups.inc()
    const res = await this.protocol.findContentLocally(this.contentKey)
    if (res) {
      return res
    }
    const nearest = this.protocol.routingTable.nearest(this.contentId, 5)
    for (const peer of nearest) {
      const dist = distance(peer.nodeId, this.contentId)
      this.lookupPeers.push({ nodeId: peer.nodeId, distance: dist })
    }
    let finished = false
    while (!finished) {
      if (this.lookupPeers.length === 0) {
        finished = true
        this.protocol.client.metrics?.failedContentLookups.inc()
        this.logger(`failed to retrieve ${toHexString(this.contentKey)} from network`)
        return
      }
      const nearestPeer = this.lookupPeers.shift()
      if (!nearestPeer) {
        return
      }
      this.logger(`sending FINDCONTENT request to ${shortId(nearestPeer!.nodeId)}`)
      const res = await this.protocol.sendFindContent(nearestPeer.nodeId, this.contentKey)
      if (!res) {
        // Node didn't respond, send a Ping to test connection.
        this.protocol.sendPing(this.protocol.routingTable.getValue(nearestPeer.nodeId)!)
        this.contacted.push(nearestPeer.nodeId)
        continue
      }
      switch (res.selector) {
        case 0: {
          // findContent returned uTP connection ID
          this.logger(`received uTP connection ID from ${shortId(nearestPeer!.nodeId)}`)
          finished = true
          nearestPeer.hasContent = true
          return new Promise((resolve) => {
            const utpDecoder = (
              contentKey: string,
              contentType: HistoryNetworkContentTypes,
              content: string
            ) => {
              this.protocol.client.removeListener('ContentAdded', utpDecoder)
              resolve(fromHexString(content))
            }
            this.protocol.client.on('ContentAdded', utpDecoder)
          })
        }

        case 1: {
          // findContent returned data sought
          this.logger(`received content corresponding to ${shortId(toHexString(this.contentKey))}`)
          finished = true
          nearestPeer.hasContent = true
          this.protocol.client.metrics?.successfulContentLookups.inc()
          // POKE -- Offer content to neighbors who should have had content but don't if we receive content directly
          for (const peer of this.contacted) {
            if (
              !this.protocol.routingTable.contentKeyKnownToPeer(peer, toHexString(this.contentKey))
            ) {
              // Only offer content if not already offered to this peer
              this.protocol.sendOffer(peer, [this.contentKey])
            }
          }
          return res.value
        }
        case 2: {
          // findContent request returned ENRs of nodes closer to content
          this.logger(`received ${res.value.length} ENRs for closer nodes`)
          for (const enr of res.value) {
            if (!finished) {
              const decodedEnr = ENR.decode(Buffer.from(enr as Uint8Array))
              // Disregard if nodes have been previously contacted during this lookup,
              // Or if nodes are currently being ignored for unresponsiveness.
              if (
                this.contacted.includes(decodedEnr.nodeId) ||
                this.protocol.routingTable.isIgnored(decodedEnr.nodeId)
              ) {
                continue
              }
              // Send a PING request to check liveness of any unknown nodes
              if (!this.protocol.routingTable.getValue(decodedEnr.nodeId)) {
                const ping = await this.protocol.sendPing(decodedEnr)
                if (!ping) {
                  this.protocol.routingTable.evictNode(decodedEnr.nodeId)
                  continue
                }
              }
              // Calculate distance and add to list of lookup peers
              // Sort list by distance to keep closest node first
              const dist = distance(decodedEnr.nodeId, this.contentId)
              this.lookupPeers.push({ nodeId: decodedEnr.nodeId, distance: dist })
              this.lookupPeers = this.lookupPeers.sort(
                (a, b) => Number(a.distance) - Number(b.distance)
              )
            }
          }
        }
      }
    }
  }
}
