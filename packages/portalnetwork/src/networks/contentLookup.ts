import { ENR, distance, NodeId } from '@chainsafe/discv5'
import { toHexString } from '@chainsafe/ssz'
import { Debugger } from 'debug'
import { serializedContentKeyToContentId, shortId } from '../util/index.js'
import { HistoryNetworkContentType } from './history/types.js'
import { BaseNetwork } from './network.js'
import { hexToBytes } from '@ethereumjs/util'

type lookupPeer = {
  nodeId: NodeId
  distance: bigint
  hasContent?: boolean
}

export type ContentLookupResponse =
  | {
      content: Uint8Array
      utp: boolean
    }
  | { enrs: Uint8Array[] }
  | undefined

export class ContentLookup {
  private network: BaseNetwork
  private lookupPeers: lookupPeer[]
  private contacted: NodeId[]
  private contentId: string
  private contentKey: Uint8Array
  private logger: Debugger
  private uTPlistener: any

  constructor(network: BaseNetwork, contentKey: Uint8Array) {
    this.network = network
    this.lookupPeers = []
    this.contacted = []
    this.contentKey = contentKey
    this.contentId = serializedContentKeyToContentId(contentKey)
    this.logger = this.network.logger.extend('lookup')
  }

  /**
   * Queries the 5 nearest nodes in the history network routing table and recursively
   * requests peers closer to the content until either the content is found or there are no more peers to query
   */
  public startLookup = async (): Promise<ContentLookupResponse> => {
    // Don't support content lookups for networks that don't implement it (i.e. Canonical Indices)
    if (!this.network.sendFindContent) return
    this.network.metrics?.totalContentLookups.inc()
    try {
      const res = await this.network.get(this.network.networkId, toHexString(this.contentKey))
      return { content: hexToBytes(res), utp: false }
    } catch (err: any) {
      this.logger(`content key not in db ${err.message}`)
    }
    const nearest = this.network.routingTable.nearest(this.contentId, 5)
    for (const peer of nearest) {
      const dist = distance(peer.nodeId, this.contentId)
      this.lookupPeers.push({ nodeId: peer.nodeId, distance: dist })
    }
    let finished = false
    while (!finished) {
      if (this.lookupPeers.length === 0) {
        finished = true
        this.network.metrics?.failedContentLookups.inc()
        this.logger(`failed to retrieve ${toHexString(this.contentKey)} from network`)
        return
      }
      const nearestPeer = this.lookupPeers.shift()
      if (!nearestPeer) {
        return
      }
      this.contacted.push(nearestPeer.nodeId)
      const res = await this.network.sendFindContent(nearestPeer.nodeId, this.contentKey)
      if (!res || res.value.length < 1) {
        continue
      }
      switch (res.selector) {
        case 0: {
          // findContent returned uTP connection ID
          this.logger(
            `received uTP connection ID from ${shortId(
              this.network.routingTable.getValue(nearestPeer!.nodeId)!,
            )}`,
          )
          finished = true
          nearestPeer.hasContent = true
          return new Promise((resolve) => {
            const utpDecoder = (
              contentKey: string,
              contentType: HistoryNetworkContentType,
              content: string,
            ) => {
              this.logger(
                `this.contentKey: ${contentType} +  ${toHexString(this.contentKey.slice(1))}`,
              )
              this.logger(`contentType: ${contentType} contentKey: ${contentKey}, .`)
              if (
                this.contentKey[0] === contentType &&
                contentKey === toHexString(this.contentKey.slice(1))
              ) {
                this.network.removeListener('ContentAdded', utpDecoder)
                resolve({ content: hexToBytes(content), utp: true })
              }
            }
            this.network.on('ContentAdded', utpDecoder)
          })
        }

        case 1: {
          // findContent returned data sought
          this.logger(`received content corresponding to ${shortId(toHexString(this.contentKey))}`)
          finished = true
          nearestPeer.hasContent = true
          this.network.metrics?.successfulContentLookups.inc()
          // POKE -- Offer content to neighbors who should have had content but don't if we receive content directly
          for (const peer of this.contacted) {
            if (
              !this.network.routingTable.contentKeyKnownToPeer(peer, toHexString(this.contentKey))
            ) {
              // Only offer content if not already offered to this peer
              this.network.sendOffer(peer, [this.contentKey])
            }
          }
          return { content: res.value as Uint8Array, utp: false }
        }
        case 2: {
          // findContent request returned ENRs of nodes closer to content
          this.logger(`received ${res.value.length} ENRs for closer nodes`)
          if (!finished) {
            for (const enr of res.value) {
              const decodedEnr = ENR.decode(enr as Uint8Array)
              // Disregard if nodes have been previously contacted during this lookup,
              // Or if nodes are currently being ignored for unresponsiveness.
              if (
                this.contacted.includes(decodedEnr.nodeId) ||
                this.network.routingTable.isIgnored(decodedEnr.nodeId)
              ) {
                continue
              }
              // Send a PING request to check liveness of any unknown nodes
              if (!this.network.routingTable.getWithPending(decodedEnr.nodeId)?.value) {
                const ping = await this.network.sendPing(decodedEnr)
                if (!ping) {
                  this.network.routingTable.evictNode(decodedEnr.nodeId)
                  continue
                }
              }
              if (!this.network.routingTable.getWithPending(decodedEnr.nodeId)?.value) {
                continue
              }
              // Calculate distance and add to list of lookup peers
              // Sort list by distance to keep closest node first
              const dist = distance(decodedEnr.nodeId, this.contentId)
              this.lookupPeers.map((peer) => peer.nodeId).includes(decodedEnr.nodeId) ||
                this.lookupPeers.push({ nodeId: decodedEnr.nodeId, distance: dist })
              this.lookupPeers = this.lookupPeers.sort(
                (a, b) => Number(a.distance) - Number(b.distance),
              )
            }
          }
        }
      }
    }
  }
}
