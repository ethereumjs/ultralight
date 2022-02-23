import { ENR, distance, NodeId, EntryStatus } from '@chainsafe/discv5'
import { fromHexString } from '@chainsafe/ssz'
import { Debugger } from 'debug'
import { getContentId, PortalNetwork, SubNetworkIds } from '..'
import {
  HistoryNetworkContentKeyUnionType,
  HistoryNetworkContentTypes,
} from '../historySubnetwork/types'
import { shortId } from '../util'

type lookupPeer = {
  nodeId: NodeId
  distance: bigint
}

export class Lookup {
  private client: PortalNetwork
  private lookupPeers: lookupPeer[]
  private contacted: NodeId[]
  private contentId: string
  private contentType: HistoryNetworkContentTypes
  private blockHash: string
  private log: Debugger

  constructor(portal: PortalNetwork, contentType: HistoryNetworkContentTypes, blockHash: string) {
    this.client = portal
    this.lookupPeers = []
    this.contacted = []
    this.contentId = getContentId(1, blockHash, contentType)
    this.blockHash = blockHash
    this.contentType = contentType
    this.log = this.client.logger.extend('lookup', ':')
  }

  /**
   * Queries the 5 nearest nodes in the history network routing table and recursively
   * requests peers closer to the content until either the content is found or there are no more peers to query
   * @param contentType contentType sought
   * @param block1Hash hex prefixed string corresponding to blockhash
   */
  public startLookup = async () => {
    this.client.metrics?.totalContentLookups.inc()
    const encodedKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: this.contentType,
      value: { chainId: 1, blockHash: fromHexString(this.blockHash) },
    })
    try {
      const res = await this.client.db.get(this.contentId)
      return res
    } catch {}
    this.client.historyNetworkRoutingTable.nearest(this.contentId, 5).forEach((peer) => {
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
      this.contacted.push(nearestPeer!.nodeId)
      this.log(`sending FINDCONTENT request to ${shortId(nearestPeer!.nodeId)}`)
      const res = await this.client.sendFindContent(
        nearestPeer!.nodeId,
        encodedKey,
        SubNetworkIds.HistoryNetwork
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
          return res.value
        }
        case 1: {
          // findContent returned data sought
          this.log(
            `received content corresponding to ${
              Object.keys(HistoryNetworkContentTypes)[this.contentType]
            }${shortId(this.blockHash)}`
          )
          finished = true
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
              if (!this.client.historyNetworkRoutingTable.getValue(decodedEnr.nodeId)) {
                this.client.historyNetworkRoutingTable.insertOrUpdate(
                  decodedEnr,
                  EntryStatus.Connected
                )
              }
            }
          })
        }
      }
    }
  }
}
