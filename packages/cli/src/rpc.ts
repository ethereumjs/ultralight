import { ENR, fromHex } from '@chainsafe/discv5'
import debug, { Debugger } from 'debug'
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
      await this._client.addBootNode(enr, SubNetworkIds.HistoryNetwork)
      return `Bootnode added for ${encodedENR.nodeId.slice(0, 15)}...`
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
    portal_ping: async (params: [string]) => {
      const [enr] = params
      const encodedENR = ENR.decodeTxt(enr)
      this.log(`portal_ping request received`)
      await this._client.sendPing(enr, SubNetworkIds.HistoryNetwork)
      this.log(`TEST PONG received from ${encodedENR.nodeId}`)
      return `PING/PONG successful with ${encodedENR.nodeId}`
    },
    portal_utp_find_content_test: async (params: [string]) => {
      this.log(`portal_utp_get_test request received`)
      const [enr] = params
      const encodedENR = ENR.decodeTxt(enr)
      await this._client.sendFindContent(
        encodedENR.nodeId,
        HistoryNetworkContentKeyUnionType.serialize({
          selector: 0,
          value: {
            chainId: 1,
            blockHash: Uint8Array.from(
              fromHex('46b332ceda6777098fe7943929e76a5fcea772a866c0fb1d170ec65c46c7e3ae')
            ),
          },
        }),
        SubNetworkIds.HistoryNetwork
      )
      await this._client.sendFindContent(
        encodedENR.nodeId,
        HistoryNetworkContentKeyUnionType.serialize({
          selector: 1,
          value: {
            chainId: 1,
            blockHash: Uint8Array.from(
              fromHex('0c1cf9b3d4aa3e20e12b355416a4e3202da53f54eaaafc882a7644e3e68127ec')
            ),
          },
        }),
        SubNetworkIds.HistoryNetwork
      )
      await this._client.sendFindContent(
        encodedENR.nodeId,
        HistoryNetworkContentKeyUnionType.serialize({
          selector: 1,
          value: {
            chainId: 1,
            blockHash: Uint8Array.from(
              fromHex('ca6063e4d9b37c2777233b723d9b08cf248e34a5ebf7f5720d59323a93eec14f')
            ),
          },
        }),
        SubNetworkIds.HistoryNetwork
      )
      return `Some uTP happened`
    },
    portal_utp_offer_test: async (params: [string]) => {
      this.log(`portal_utp_offer_test request received`)
      const [enr] = params
      const encodedENR = ENR.decodeTxt(enr)
      await this._client.sendOffer(
        encodedENR.nodeId,
        [
          HistoryNetworkContentKeyUnionType.serialize({
            selector: 1,
            value: {
              chainId: 1,
              blockHash: fromHex(
                '46b332ceda6777098fe7943929e76a5fcea772a866c0fb1d170ec65c46c7e3ae'
              ),
            },
          }),
        ],
        SubNetworkIds.HistoryNetwork
      )
      return `Some uTP happened`
    },
  }
  // portal_utp_send_syn: async (params: [string]) => {
  //   const [enr] = params
  //   const id = ENR.decodeTxt(enr).nodeId
  //   this.log(`portal_utp_send_syn_test starting`)
  //   try {
  //     this._client.sendUtpStreamRequest(id, 1234)
  //     this.log('syn sent')
  //   } catch {
  //     this.log('syn not sent')
  //   }
  // },

  constructor(client: PortalNetwork) {
    this._client = client
    this.log = debug(this._client.client.enr.nodeId.slice(0, 5)).extend('ultralight:RPC')
  }

  public getMethods() {
    return this._methods
  }
}
