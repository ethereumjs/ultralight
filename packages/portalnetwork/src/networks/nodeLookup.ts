import { EntryStatus, distance, log2Distance } from '@chainsafe/discv5'
import { ENR } from '@chainsafe/enr'

import { shortId } from '../index.js'

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
  private static readonly LOOKUP_TIMEOUT = 3000 // 3 seconds per peer
  private static readonly MAX_PEERS = 16 // k parameter from Kademlia

  constructor(network: BaseNetwork, nodeId: string) {
    this.network = network
    this.nodeSought = nodeId
    this.log = this.network.logger
      .extend('nodeLookup')
      .extend(log2Distance(this.network.enr.nodeId, this.nodeSought).toString())
  }
            const decodedEnr = ENR.decode(enr)
            if (nodesAlreadyAsked.has(decodedEnr.nodeId)) {
              return
            }
            if (decodedEnr.nodeId === this.nodeSought) {
              // `nodeSought` was found -- add to table and terminate lookup
              finished = true
              this.network.routingTable.insertOrUpdate(decodedEnr, EntryStatus.Connected)
              await this.network.sendPing(decodedEnr)
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
        `finished node lookup for ${shortId(
          this.nodeSought,
          this.network.routingTable,
        )} and found ${newPeers.length} new peers`,
      )
    for await (const enr of newPeers) {
      // Add all newly found peers to the subnetwork routing table
      const res = await this.network.sendPing(enr)
      if (res) this.network.routingTable.insertOrUpdate(enr, EntryStatus.Connected)
    }
    return this.network.routingTable.getWithPending(this.nodeSought)?.value.encodeTxt()
  }
}
