import { ENR, fromHex } from '@chainsafe/discv5'
import { debug, Debugger } from 'debug'
import {
  PortalNetwork,
  getHistoryNetworkContentId,
  SubNetworkIds,
  reassembleBlock,
  HistoryNetworkContentKeyUnionType,
} from 'portalnetwork'
import * as rlp from 'rlp'
import { addRLPSerializedBlock, shortId } from 'portalnetwork'
import { isValidId } from './util'

export class RPCManager {
  public _client: PortalNetwork
  private log: Debugger
  private _methods: { [key: string]: Function } = {
    discv5_nodeInfo: async () => {
      this.log('discv5_nodeInfo request received')
      return 'Ultralight-CLI: v0.0.1'
    },
    eth_getBlockByHash: async (params: [string, boolean]) => {
      const [blockHash, includeTransactions] = params
      this.log(
        `eth_getBlockByHash request received. blockHash: ${blockHash} includeTransactions: ${includeTransactions}`
      )
      // lookup block header in DB and return if found
      const headerlookupKey = getHistoryNetworkContentId(1, blockHash, 0)
      const bodylookupKey = includeTransactions && getHistoryNetworkContentId(1, blockHash, 1)
      let header
      let body
      let block
      try {
        header = await this._client.db.get(headerlookupKey)
        body = includeTransactions ? await this._client.db.get(bodylookupKey) : rlp.encode([[], []])
        block = reassembleBlock(
          fromHex(header.slice(2)),
          typeof body === 'string' ? fromHex(body.slice(2)) : body
        )
        this._client.metrics?.successfulContentLookups.inc()
        return block
      } catch (err: any) {
        this.log(err.message)
      }
      // If block isn't in local DB, request block from network
      try {
        header = await this._client.historyNetworkContentLookup(0, blockHash)
        if (!header) {
          return 'Block not found'
        }
        body = includeTransactions
          ? await this._client.historyNetworkContentLookup(1, blockHash)
          : rlp.encode([[], []])
        // TODO: Figure out why block body isn't coming back as Uint8Array
        block = reassembleBlock(header as Uint8Array, body)
        return block
      } catch {
        return 'Block not found'
      }
    },
    portal_addBootNode: async (params: [string]) => {
      const [enr] = params
      const encodedENR = ENR.decodeTxt(enr)
      this.log(
        `portal_addBootNode request received for NodeID: ${encodedENR.nodeId.slice(0, 15)}...`
      )
      const res = await this._client.sendPing(enr, SubNetworkIds.HistoryNetwork)
      return res?.enrSeq ? `ENR added for ${encodedENR.nodeId.slice(0, 15)}...` : 'Node not found'
    },
    portal_addBlockToHistory: async (params: [string, string]) => {
      const [blockHash, rlpHex] = params
      try {
        addRLPSerializedBlock(rlpHex, blockHash, this._client)
        return `blockheader for ${blockHash} added to content DB`
      } catch (err: any) {
        this.log(`Error trying to load block to DB. ${err.message.toString()}`)
        return `internal error`
      }
    },
    portal_nodeEnr: async () => {
      this.log(`portal_nodeEnr request received`)
      const enr = this._client.client.enr.encodeTxt()
      return enr
    },
    portal_findNodes: async (params: [string, number[]]) => {
      const [dstId, distances] = params
      if (!isValidId(dstId)) {
        return 'invalid node id'
      }
      this.log(`portal_findNodes request received with these distances ${distances.toString()}`)
      const res = await this._client.sendFindNodes(
        dstId,
        Uint16Array.from(distances),
        SubNetworkIds.HistoryNetwork
      )
      this.log(`response received to findNodes ${res?.toString()}`)
      return `${res?.total ?? 0} nodes returned`
    },
    portal_offer: async (params: [string, string, number]) => {
      const [dstId, blockHash, contentType] = params
      if (!isValidId(dstId) || contentType < 0 || contentType > 2) {
        return 'invalid parameters'
      }
      const contentKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: contentType,
        value: {
          chainId: 1,
          blockHash: fromHex(blockHash.slice(2)),
        },
      })
      const res = await this._client.sendOffer(dstId, [contentKey], SubNetworkIds.HistoryNetwork)
      this.log(`response received to offer ${res?.toString()}`)
      return `${shortId(dstId)} ${res ? 'accepted' : 'rejected'} offer`
    },
  }

  constructor(client: PortalNetwork) {
    this._client = client
    this.log = debug(this._client.client.enr.nodeId.slice(0, 5)).extend('ultralight:RPC')
  }

  public getMethods() {
    return this._methods
  }
}
