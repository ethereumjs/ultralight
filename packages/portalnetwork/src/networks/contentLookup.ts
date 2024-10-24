import { distance } from '@chainsafe/discv5'
import { ENR } from '@chainsafe/enr'
import { toHexString } from '@chainsafe/ssz'
import { short } from '@ethereumjs/util'
import { Heap } from 'heap-js'

import { serializedContentKeyToContentId, shortId } from '../util/index.js'

import type { BaseNetwork } from './network.js'
import type { NodeId } from '@chainsafe/enr'
import type { Debugger } from 'debug'
import type { Comparator } from 'heap-js'

type LookupPeer = {
  nodeId: NodeId
  distance: number
}
const customPriorityComparator: Comparator<LookupPeer> = (a, b) => a.distance - b.distance

export type ContentLookupResponse =
  | {
      content: Uint8Array
      utp: boolean
    }
  | { enrs: Uint8Array[] }
  | undefined

export class ContentLookup {
  private network: BaseNetwork
  private lookupPeers: Heap<LookupPeer>
  private contacted: NodeId[]
  private contentId: string
  private contentKey: Uint8Array
  private logger: Debugger
  private timeout: number
  private finished: boolean
  private content: ContentLookupResponse
  private pending: Set<NodeId>
  constructor(network: BaseNetwork, contentKey: Uint8Array) {
    this.network = network
    this.lookupPeers = new Heap(customPriorityComparator)
    this.contacted = []
    this.contentKey = contentKey
    this.contentId = serializedContentKeyToContentId(contentKey)
    this.logger = this.network.logger.extend('LOOKUP').extend(short(contentKey, 6))
    this.timeout = network.portal.utpTimout
    this.finished = false
    this.pending = new Set()
  }

  /**
   * Queries the 5 nearest nodes in the history network routing table and recursively
   * requests peers closer to the content until either the content is found or there are no more peers to query
   */
  public startLookup = async (): Promise<ContentLookupResponse> => {
    // Don't support content lookups for networks that don't implement it (i.e. Canonical Indices)
    if (!this.network.sendFindContent) return
    this.logger(`starting recursive content lookup for ${toHexString(this.contentKey)}`)
    this.network.portal.metrics?.totalContentLookups.inc()
    try {
      // Try to find content locally first
      const res = await this.network.findContentLocally(this.contentKey)
      if (res === undefined) throw new Error('No content found')
      return { content: res, utp: false }
    } catch (err: any) {
      this.logger(`content key not in db ${err.message}`)
    }
    const nearest = this.network.routingTable.nearest(this.contentId, 5)
    for (const peer of nearest) {
      const dist = distance(peer.nodeId, this.contentId)
      this.lookupPeers.push({ nodeId: peer.nodeId, distance: Number(dist) })
    }

    while (!this.finished && (this.lookupPeers.length > 0 || this.pending.size > 0)) {
      if (this.lookupPeers.length > 0) {
        // Ask more peers (up to 5) for content
        const peerBatch: LookupPeer[] = []
        while (this.lookupPeers.peek() && peerBatch.length < 5) {
          peerBatch.push(this.lookupPeers.pop()!)
        }
        const promises = peerBatch.map((peer) => this.processPeer(peer))

        this.logger(`Asking ${promises.length} nodes for content`)
        // Wait for first response
        try {
          await Promise.any(promises)
        } catch (err) {
          this.logger(`All requests errored`)
        }
        this.logger(
          `Have ${this.lookupPeers.length} peers left to ask and ${this.pending.size} pending requests`,
        )
      } else {
        this.logger(`Waiting on ${this.pending.size} content requests`)
        this.logger(this.pending)
        // We only have pending requests left so wait and see if they are all resolved
        await new Promise((resolve) => setTimeout(() => resolve(undefined), this.timeout))
      }
    }
    this.logger(`Finished lookup.  Lookup was successful: ${this.content !== undefined}`)
    return this.content
  }

  private processPeer = async (peer: LookupPeer): Promise<ContentLookupResponse | void> => {
    if (this.network.routingTable.isIgnored(peer.nodeId)) {
      return
    }
    this.contacted.push(peer.nodeId)
    this.pending.add(peer.nodeId)
    if (this.finished) return
    this.logger(`Requesting content from ${shortId(peer.nodeId)}`)
    const res = await this.network.sendFindContent!(peer.nodeId, this.contentKey)
    this.pending.delete(peer.nodeId)
    if (this.finished) {
      this.logger(`Response from ${shortId(peer.nodeId)} arrived after lookup finished`)
      return
    }
    if (res === undefined) {
      this.logger(`No response to findContent from ${shortId(peer.nodeId)}`)
      return undefined
    }
    if ('content' in res) {
      this.finished = true
      // findContent returned data sought
      this.logger(`received content corresponding to ${shortId(toHexString(this.contentKey))}`)
      // Mark content offered to peer that sent it to us (so we don't try to offer it to them)
      this.network.routingTable.contentKeyKnownToPeer(peer.nodeId, this.contentKey)
      this.network.portal.metrics?.successfulContentLookups.inc()
      // Offer content to neighbors who should have had content but don't if we receive content directly
      for (const contactedPeer of this.contacted) {
        if (!this.network.routingTable.contentKeyKnownToPeer(contactedPeer, this.contentKey)) {
          // Only offer content if not already offered to this peer
          void this.network.sendOffer(contactedPeer, [this.contentKey])
        }
      }
      this.content = res
      return res
    } else {
      // findContent request returned ENRs of nodes closer to content
      this.logger(`received ${res.enrs.length} ENRs for closer nodes`)
      for (const enr of res.enrs) {
        const decodedEnr = ENR.decode(enr as Uint8Array)
        if (
          this.contacted.includes(decodedEnr.nodeId) ||
          this.network.routingTable.isIgnored(decodedEnr.nodeId)
        ) {
          continue
        }
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
        const dist = distance(decodedEnr.nodeId, this.contentId)
        this.lookupPeers.push({ nodeId: decodedEnr.nodeId, distance: Number(dist) })
      }
      throw new Error('Continue')
    }
  }
}
