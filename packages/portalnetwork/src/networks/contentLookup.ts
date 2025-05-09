import { distance } from '@chainsafe/discv5'
import { ENR } from '@chainsafe/enr'
import { bigIntToHex, bytesToHex, hexToBytes, short } from '@ethereumjs/util'
import { Heap } from 'heap-js'

import { serializedContentKeyToContentId, shortId } from '../util/index.js'

import type { NodeId } from '@chainsafe/enr'
import type { PrefixedHexString } from '@ethereumjs/util'
import type { Debugger } from 'debug'
import type { Comparator } from 'heap-js'
import type { BaseNetwork } from './network.js'
import type { ContentLookupResponse, ContentTrace, LookupPeer } from './types.js'

const customPriorityComparator: Comparator<LookupPeer> = (a, b) => a.distance - b.distance

export class ContentLookup {
  private network: BaseNetwork
  private lookupPeers: Heap<LookupPeer>
  private meta: Map<NodeId, { enr: string; distance: string }>
  private contentId: string
  private contentKey: Uint8Array
  private logger: Debugger
  private timeout: number
  private finished: boolean
  private content: ContentLookupResponse
  private pending: Set<NodeId>
  private queuedPeers: Set<NodeId>
  private completedRequests?: Map<NodeId, NodeId[]>
  private contentTrace?: ContentTrace
  constructor(network: BaseNetwork, contentKey: Uint8Array, trace = false) {
    this.network = network
    this.lookupPeers = new Heap(customPriorityComparator)
    this.contentKey = contentKey
    this.contentId = serializedContentKeyToContentId(contentKey)
    this.logger = this.network.logger.extend('LOOKUP').extend(short(contentKey, 6))
    this.timeout = 3000 // 3 seconds
    this.finished = false
    this.meta = new Map()
    this.pending = new Set()
    this.queuedPeers = new Set()
    this.completedRequests = trace ? new Map() : undefined
    this.contentTrace = trace
      ? {
          origin: ('0x' + this.network.portal.discv5.enr.nodeId) as PrefixedHexString,
          targetId: Array.from(hexToBytes(`0x${this.contentId}`)) as any,
          metadata: {},
        }
      : undefined
  }

  private addPeerToQueue = (enr: ENR) => {
    if (this.queuedPeers.has(enr.nodeId) || this.network.portal.uTP.hasRequests(enr.nodeId)) {
      return
    }

    const dist = distance(enr.nodeId, this.contentId)
    this.lookupPeers.push({ enr, distance: Number(dist) })
    this.queuedPeers.add(enr.nodeId)
    this.meta.set('0x' + enr.nodeId, {
      enr: enr.encodeTxt(),
      distance: bigIntToHex(dist),
    })
    this.logger(`Adding ${shortId(enr.nodeId)} to lookup queue (${this.lookupPeers.size()})`)
  }

  /**
   * Queries the 5 nearest nodes in the history network routing table and recursively
   * requests peers closer to the content until either the content is found or there are no more peers to query
   */
  public startLookup = async (): Promise<ContentLookupResponse> => {
    // Don't support content lookups for networks that don't implement it (i.e. Canonical Indices)
    if (!this.network.sendFindContent) return
    this.contentTrace &&
      (this.contentTrace.startedAtMs = {
        secs_since_epoch: Math.floor(Date.now() / 1000),
        nanos_since_epoch: 0, // TODO: figure out what this is
      })
    this.logger(`starting recursive content lookup for ${bytesToHex(this.contentKey)}`)
    this.network.portal.metrics?.totalContentLookups.inc()
    try {
      // Try to find content locally first
      const res = await this.network.findContentLocally(this.contentKey)
      if (res === undefined) throw new Error('No content found')
      return { content: res, utp: false, trace: this.contentTrace }
    } catch (err: any) {
      this.logger(`content key not in db ${err.message}`)
    }

    // Sort known peers by distance to the content
    const nearest = this.network.routingTable.values()
    for (const enr of nearest) {
      this.addPeerToQueue(enr)
    }

    while (!this.finished && (this.lookupPeers.length > 0 || this.pending.size > 0)) {
      if (this.lookupPeers.length > 0) {
        // Ask more peers (up to 5) for content
        const peerBatch: LookupPeer[] = []
        const availableSlots = 5 - this.pending.size
        while (this.lookupPeers.peek() && peerBatch.length < availableSlots) {
          const next = this.lookupPeers.pop()!
          peerBatch.push(next)
        }
        const promises = peerBatch.map((peer) => {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => {
            controller.abort()
          }, this.timeout)

          return Promise.race([
            this.processPeer(peer, controller.signal).finally(() => {
              clearTimeout(timeoutId)
            }),
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
          this.logger('All requests errored')
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
      this.network.gossipManager.add(this.contentKey)
    }

    // Add cancelled/metadata elements to trace
    if (this.contentTrace !== undefined) {
      this.contentTrace.cancelled = Array.from(this.pending.values()).map(
        (enr) => '0x' + ENR.decodeTxt(enr).nodeId,
      )
      this.contentTrace.responses = Object.fromEntries(this.completedRequests!.entries()) as Record<
        NodeId,
        NodeId[]
      >
      for (const nodeId of Object.keys(this.contentTrace.responses)) {
        this.contentTrace.metadata!['0x' + nodeId] = this.meta.get('0x' + nodeId)! as {
          enr: `enr:${string}`
          distance: `0x${string}`
        }
      }
      for (const nodeId of this.contentTrace.cancelled) {
        this.contentTrace.metadata!['0x' + nodeId] = this.meta.get('0x' + nodeId)! as {
          enr: `enr:${string}`
          distance: `0x${string}`
        }
      }
      if (this.content !== undefined) {
        this.content.trace = this.contentTrace
      } else {
        this.content = { enrs: [], trace: this.contentTrace }
      }
    }
    return this.content
  }

  private processPeer = async (
    peer: LookupPeer,
    signal?: AbortSignal,
  ): Promise<ContentLookupResponse | void> => {
    if (this.finished) return
    if (this.network.routingTable.isIgnored(peer.enr.nodeId)) {
      this.logger(`peer ${shortId(peer.enr.nodeId)} is ignored`)
      return
    }

    this.pending.add(peer.enr.encodeTxt())
    this.logger(`Requesting content from ${shortId(peer.enr.nodeId)}`)
    try {
      // Create a promise that rejects when the signal is aborted
      const abortPromise = new Promise((_, reject) => {
        if (signal) {
          signal.addEventListener('abort', () => {
            reject(new Error('Request cancelled'))
          })
        }
      })

      // Race between the actual request and the abort signal
      const res = (await Promise.race([
        this.network.sendFindContent!(peer.enr, this.contentKey),
        abortPromise,
      ])) as ContentLookupResponse | undefined

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
        if (this.contentTrace !== undefined) {
          this.completedRequests!.set('0x' + peer.enr.nodeId, [])
          this.contentTrace.receivedFrom = '0x' + peer.enr.nodeId
        }
        return res
      } else {
        // findContent request returned ENRs of nodes closer to content
        this.logger(`received ${res.enrs.length} ENRs for closer nodes`)
        for (const enr of res.enrs) {
          const decodedEnr = ENR.decode(enr)
          this.addPeerToQueue(decodedEnr)
        }
        this.completedRequests &&
          this.completedRequests.set(
            '0x' + peer.enr.nodeId,
            res.enrs.map((enr) => '0x' + ENR.decode(enr).nodeId),
          )
        throw new Error('Continue')
      }
    } catch (err) {
      this.pending.delete(peer.enr.encodeTxt())
      if (signal?.aborted) {
        this.logger(`Request to ${shortId(peer.enr.nodeId)} was cancelled`)
      }
      throw err
    }
  }
}
