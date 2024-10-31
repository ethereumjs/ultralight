import { distance } from '@chainsafe/discv5'
import { ENR } from '@chainsafe/enr'
import { bytesToHex, short } from '@ethereumjs/util'
import { Heap } from 'heap-js'

import { serializedContentKeyToContentId, shortId } from '../util/index.js'

import type { BaseNetwork } from './network.js'
import type { NodeId } from '@chainsafe/enr'
import type { Debugger } from 'debug'
import type { Comparator } from 'heap-js'

type LookupPeer = {
  enr: ENR
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
  private addedToLookup: Set<NodeId>
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
    this.contentKey = contentKey
    this.contentId = serializedContentKeyToContentId(contentKey)
    this.logger = this.network.logger.extend('LOOKUP').extend(short(contentKey, 6))
    this.timeout = 3000 // 3 seconds
    this.finished = false
    this.addedToLookup = new Set()

    this.pending = new Set()
  }

  /**
   * Queries the 5 nearest nodes in the history network routing table and recursively
   * requests peers closer to the content until either the content is found or there are no more peers to query
   */
  public startLookup = async (): Promise<ContentLookupResponse> => {
    // Don't support content lookups for networks that don't implement it (i.e. Canonical Indices)
    if (!this.network.sendFindContent) return
    this.logger(`starting recursive content lookup for ${bytesToHex(this.contentKey)}`)
    this.network.portal.metrics?.totalContentLookups.inc()
    try {
      // Try to find content locally first
      const res = await this.network.findContentLocally(this.contentKey)
      if (res === undefined) throw new Error('No content found')
      return { content: res, utp: false }
    } catch (err: any) {
      this.logger(`content key not in db ${err.message}`)
    }

    // Sort known peers by distance to the content
    const nearest = this.network.routingTable.values()
    for (const enr of nearest) {
      const dist = distance(enr.nodeId, this.contentId)
      this.lookupPeers.push({ enr, distance: Number(dist) })
      this.addedToLookup.add(enr.encodeTxt())
    }

    while (!this.finished && (this.lookupPeers.length > 0 || this.pending.size > 0)) {
      if (this.lookupPeers.length > 0) {
        // Ask more peers (up to 5) for content
        const peerBatch: LookupPeer[] = []
        while (this.lookupPeers.peek() && peerBatch.length < 5) {
          const next = this.lookupPeers.pop()!
          peerBatch.push(next)
        }
        const promises = peerBatch.map((peer) => {
          return Promise.race([
            this.processPeer(peer),
            new Promise((resolve) =>
              setTimeout(() => {
                resolve(undefined)
              }, this.timeout),
            ),
          ])
        })

        this.logger(`Asking ${promises.length} nodes for content`)
        // Wait for first response
        try {
          await Promise.any(promises)
        } catch (err) {
          this.logger(`All requests errored`)
        }
        if (!this.finished) {
          this.logger(
            `Have ${this.lookupPeers.size()} peers left to ask and ${this.pending.size} pending requests`,
          )
        }
      } else {
        this.logger(`Waiting on ${this.pending.size} content requests`)
        this.logger(this.pending)
        // We only have pending requests left so wait and see if they are all resolved
        await new Promise((resolve) => setTimeout(() => resolve(undefined), this.timeout))
      }
    }
    this.logger(`Finished lookup.  Lookup was successful: ${this.content !== undefined}`)
    if (this.content !== undefined) {
      const closest = this.network.routingTable.nearest(this.contentId, 5)
      for (const enr of closest) {
        void this.network.sendOffer(enr.nodeId, [this.contentKey])
      }
    }
    return this.content
  }

  private processPeer = async (peer: LookupPeer): Promise<ContentLookupResponse | void> => {
    if (this.finished) return
    if (this.network.routingTable.isIgnored(peer.enr.nodeId)) {
      this.logger(`peer ${shortId(peer.enr.nodeId)} is ignored`)
      return
    }

    this.pending.add(peer.enr.encodeTxt())
    this.logger(`Requesting content from ${shortId(peer.enr.nodeId)}`)
    try {
      const res = await this.network.sendFindContent!(peer.enr.encodeTxt(), this.contentKey)
      this.pending.delete(peer.enr.encodeTxt())
      if (this.finished) {
        this.logger(`Response from ${shortId(peer.enr.nodeId)} arrived after lookup finished`)
        return
      }
      if (res === undefined) {
        this.logger(`No response to findContent from ${shortId(peer.enr.nodeId)}`)
        return undefined
      }
      if ('content' in res) {
        this.finished = true
        this.content = res
        // findContent returned data sought
        this.logger(`received content corresponding to ${shortId(bytesToHex(this.contentKey))}`)
        // Mark content offered to peer that sent it to us (so we don't try to offer it to them)
        this.network.routingTable.contentKeyKnownToPeer(peer.enr.nodeId, this.contentKey)
        this.network.portal.metrics?.successfulContentLookups.inc()
        return res
      } else {
        // findContent request returned ENRs of nodes closer to content
        this.logger(`received ${res.enrs.length} ENRs for closer nodes`)
        for (const enr of res.enrs) {
          const decodedEnr = ENR.decode(enr as Uint8Array)
          if (!this.addedToLookup.has(decodedEnr.encodeTxt())) {
            const dist = distance(decodedEnr.nodeId, this.contentId)
            this.lookupPeers.push({ enr: decodedEnr, distance: Number(dist) })
            this.addedToLookup.add(decodedEnr.encodeTxt())
            this.logger(
              `Adding ${shortId(decodedEnr.nodeId)} to lookup queue (${this.lookupPeers.size()})`,
            )
          }
        }
        throw new Error('Continue')
      }
    } catch (err) {
      this.pending.delete(peer.enr.encodeTxt())
      throw err
    }
  }
}
