import { ENR, distance, NodeId, EntryStatus } from '@chainsafe/discv5'
import { fromHexString } from '@chainsafe/ssz'
import debug from 'debug'
import { getContentId, PortalNetwork, SubNetworkIds } from '..'
import {
  HistoryNetworkContentKeyUnionType,
  HistoryNetworkContentTypes,
} from '../historySubnetwork/types'
import { shortId } from '../util'

const log = debug('portalnetwork:lookup')

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
  constructor(portal: PortalNetwork, contentType: HistoryNetworkContentTypes, blockHash: string) {
    this.client = portal
    this.lookupPeers = []
    this.contacted = []
    this.contentId = getContentId(1, blockHash, contentType)
    this.blockHash = blockHash
    this.contentType = contentType
  }

  /**
   * Queries the 5 nearest nodes in the history network routing table and recursively
   * requests peers closer to the content until either the content is found or there are no more peers to query
   * @param contentType contentType sought
   * @param block1Hash hex prefixed string corresponding to blockhash
   */
  public startLookup = async () => {
    const encodedKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: this.contentType,
      value: { chainId: 1, blockHash: fromHexString(this.blockHash) },
    })
    this.client.historyNetworkRoutingTable.nearest(this.contentId, 5).forEach((peer) => {
      const dist = distance(peer.nodeId, this.contentId)
      this.lookupPeers.push({ nodeId: peer.nodeId, distance: dist })
    })

    let finished = false
    while (!finished) {
      if (this.lookupPeers.length === 0) {
        finished = true
        continue
      }
      const nearestPeer = this.lookupPeers.shift()
      this.contacted.push(nearestPeer!.nodeId)
      log(`sending FINDCONTENT request to ${shortId(nearestPeer!.nodeId)}`)
      const res = await this.client.sendFindContent(
        nearestPeer!.nodeId,
        encodedKey,
        SubNetworkIds.HistoryNetwork
      )

      if (typeof res === 'string') {
        // findContent returned data sought
        log(`received content corresponding to ${shortId(this.blockHash)}`)
        finished = true
        return res
      }

      if (typeof res === 'number') {
        // findContent returned uTP connection ID
        log(`received uTP connection ID from ${shortId(nearestPeer!.nodeId)}`)
        finished = true
        return res
      }
      // findContent request returned ENRs of nodes closer to content
      if (res) {
        log(`received ${res.length} ENRs for closer nodes`)
        res.forEach((enr) => {
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
                this.lookupPeers.splice(index - 1, 0, { nodeId: decodedEnr.nodeId, distance: dist })
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
