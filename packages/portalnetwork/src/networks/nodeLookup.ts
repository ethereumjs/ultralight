import { EntryStatus, distance, log2Distance } from '@chainsafe/discv5'
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

  private selectClosestPending(pendingNodes: Map<string, ENR>, count: number): ENR[] {
    return Array.from(pendingNodes.values())
      .sort((a, b) =>
        Number(distance(a.nodeId, this.nodeSought) - distance(b.nodeId, this.nodeSought)),
      )
      .slice(0, count)
  }

  private async queryPeer(
    peer: ENR,
    queriedNodes: Set<string>,
    pendingNodes: Map<string, ENR>,
  ): Promise<void> {
    const distanceToTarget = log2Distance(peer.nodeId, this.nodeSought)

    try {
      // Set timeout for individual peer query
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Peer query timeout')), NodeLookup.LOOKUP_TIMEOUT)
      })

      const queryPromise = async () => {
        const response = await this.network.sendFindNodes(peer.nodeId, [distanceToTarget])
        if (!response?.enrs) return

        for (const enr of response.enrs) {
          try {
            const decodedEnr = ENR.decode(enr)
            const nodeId = decodedEnr.nodeId

            // Skip if we've already queried this node
            if (queriedNodes.has(nodeId)) continue

            // If we found our target
            if (nodeId === this.nodeSought) {
              this.network.routingTable.insertOrUpdate(decodedEnr, EntryStatus.Connected)
              await this.network.sendPing(decodedEnr)
              return
            }

            // Add to pending if closer than the peer that gave us this ENR
            if (
              pendingNodes.size < NodeLookup.MAX_PEERS &&
              !this.network.routingTable.isIgnored(nodeId)
            ) {
              pendingNodes.set(nodeId, decodedEnr)
            } else {
              return
            }
          } catch (error) {
            this.log(`Error processing ENR: ${error}`)
          }
        }
      }

      await Promise.race([queryPromise(), timeoutPromise])
    } catch (error) {
      this.log(`Error querying peer ${peer.nodeId}: ${error}`)
    } finally {
      queriedNodes.add(peer.nodeId)
    }
  }

  public async startLookup(): Promise<string | undefined> {
    const queriedNodes = new Set<string>()
    const pendingNodes = new Map<string, ENR>() // nodeId -> ENR

    // Initialize with closest known peers
    const initialPeers = this.network.routingTable.nearest(
      this.nodeSought,
      NodeLookup.CONCURRENT_LOOKUPS,
    )
    for (const peer of initialPeers) {
      pendingNodes.set(peer.nodeId, peer)
    }

    while (pendingNodes.size > 0) {
      this.log(`Continuing lookup with ${pendingNodes.size} pending nodes`)

      // Select closest α nodes we haven't queried yet
      const currentBatch = this.selectClosestPending(pendingNodes, NodeLookup.CONCURRENT_LOOKUPS)
      if (currentBatch.length === 0) break

      // Query selected nodes in parallel with timeout
      const lookupPromises = currentBatch.map((peer) =>
        this.queryPeer(peer, queriedNodes, pendingNodes),
      )

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
        // Continue with next round even if current round had errors
      }

      // Remove queried nodes from pending
      for (const peer of currentBatch) {
        pendingNodes.delete(peer.nodeId)
      }
    }

    // Add discovered peers to routing table
    const newPeers = Array.from(queriedNodes)
      .map((nodeId) => {
        try {
          return this.network.routingTable.getWithPending(nodeId)?.value
        } catch {
          return undefined
        }
      })
      .filter((enr): enr is ENR => enr !== undefined)

    await this.addNewPeers(newPeers)

    // Return target node's ENR if found
    return this.network.routingTable.getWithPending(this.nodeSought)?.value.encodeTxt()
  }
}
