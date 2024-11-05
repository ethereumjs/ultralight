import { EntryStatus, MAX_NODES_PER_BUCKET, distance, log2Distance } from '@chainsafe/discv5'
import { ENR } from '@chainsafe/enr'

import type { BaseNetwork } from './network.js'
import type { Debugger } from 'debug'

// This class implements a version of the the lookup algorithm defined in the Kademlia paper
// https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf.

export class NodeLookup {
  private network: BaseNetwork
  private nodeSought: string
  private log: Debugger

  // Configuration constants
  private static readonly CONCURRENT_LOOKUPS = 3 // Alpha (a) parameter from Kademlia
  private static readonly LOOKUP_TIMEOUT = 5000 // 5 seconds per peer

  private queriedNodes: Set<string>
  private pendingNodes: Map<string, ENR> // nodeId -> ENR

  constructor(network: BaseNetwork, nodeId: string) {
    this.network = network
    this.nodeSought = nodeId
    this.log = this.network.logger
      .extend('nodeLookup')
      .extend(log2Distance(this.network.enr.nodeId, this.nodeSought).toString())
    this.queriedNodes = new Set<string>()
    this.pendingNodes = new Map<string, ENR>() // nodeId -> ENR

    // Initialize with closest known peers
    const initialPeers = this.network.routingTable.nearest(this.nodeSought, 16)
    for (const peer of initialPeers) {
      this.pendingNodes.set(peer.nodeId, peer)
    }
  }

  private async addNewPeers(peers: ENR[]): Promise<void> {
    const addPromises = peers.map(async (enr) => {
      try {
        const res = await this.network.sendPing(enr)
        if (res) {
          this.network.routingTable.insertOrUpdate(enr, EntryStatus.Connected)
        }
      } catch (error) {
        this.log(`Error adding peer ${enr.nodeId}: ${error}`)
      }
    })

    await Promise.allSettled(addPromises)
  }

  private selectClosestPending(): ENR[] {
    return Array.from(this.pendingNodes.values())
      .sort((a, b) =>
        Number(distance(a.nodeId, this.nodeSought) - distance(b.nodeId, this.nodeSought)),
      )
      .slice(0, NodeLookup.CONCURRENT_LOOKUPS)
  }

  private async queryPeer(peer: ENR): Promise<void> {
    const distanceToTarget = log2Distance(peer.nodeId, this.nodeSought)

    try {
      // Set timeout for individual peer query
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Peer query timeout')), NodeLookup.LOOKUP_TIMEOUT)
      })

      const queryPromise = async () => {
        const response = await this.network.sendFindNodes(peer.encodeTxt(), [distanceToTarget])
        if (!response?.enrs) return

        for (const enr of response.enrs) {
          const decodedEnr = ENR.decode(enr)
          const nodeId = decodedEnr.nodeId
          try {
            // Skip if we've already queried this node
            if (this.queriedNodes.has(nodeId)) continue

            // Skip if the node is ignored
            if (this.network.routingTable.isIgnored(nodeId)) {
              continue
            }

            // Add to pending
            this.pendingNodes.set(nodeId, decodedEnr)
          } catch (error) {
            continue
            // this.log(`Error processing ENR: ${decodedEnr.encodeTxt()}`)
          }
        }
      }

      await Promise.race([queryPromise(), timeoutPromise])
    } catch (error) {
      // NOOP
    } finally {
      this.queriedNodes.add(peer.nodeId)
    }
  }

  public async startLookup(): Promise<string | undefined> {
    const bucket = log2Distance(this.network.enr.nodeId, this.nodeSought)
    const startingSize = this.network.routingTable.buckets[bucket].size()
    this.log(`Starting lookup in bucket ${bucket} (${startingSize}/${MAX_NODES_PER_BUCKET} peers)`)

    while (this.pendingNodes.size > 0) {
      const full = this.network.routingTable.buckets[bucket].size() >= MAX_NODES_PER_BUCKET

      if (full) {
        this.log(`Bucket is full, stopping lookup`)
        this.log(
          `Finished lookup in bucket ${bucket} (${MAX_NODES_PER_BUCKET}/${MAX_NODES_PER_BUCKET} peers) +${MAX_NODES_PER_BUCKET - startingSize}`,
        )
        return
      }

      // Select closest α nodes we haven't queried yet
      const currentBatch = this.selectClosestPending()
      if (currentBatch.length === 0) break

      // Query selected nodes in parallel with timeout
      const lookupPromises = currentBatch.map((peer) => this.queryPeer(peer))

      try {
        await Promise.race([
          Promise.all(lookupPromises),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Lookup round timeout')),
              NodeLookup.LOOKUP_TIMEOUT * NodeLookup.CONCURRENT_LOOKUPS,
            ),
          ),
        ])
      } catch (error) {
        this.log(`error: ${error}`)
      }

      // Remove queried nodes from pending
      for (const peer of currentBatch) {
        this.pendingNodes.delete(peer.nodeId)
      }
    }
    const finalSize = this.network.routingTable.buckets[bucket].size()
    this.log(
      `Finished lookup in bucket ${bucket} (${finalSize}/${MAX_NODES_PER_BUCKET} peers) +${finalSize - startingSize}`,
    )
  }
}
