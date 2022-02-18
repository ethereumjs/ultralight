import { ENR, fromHex } from '@chainsafe/discv5'
import debug from 'debug'
import { PortalNetwork, getContentId, SubNetworkIds, reassembleBlock } from 'portalnetwork'
import rlp from 'rlp'
import { addRLPSerializedBlock } from 'portalnetwork/dist/util'
const log = debug('ultralight:RPC')

export class RPCManager {
  public _client: PortalNetwork
  private _methods: { [key: string]: Function } = {
    discv5_nodeInfo: async () => {
      log('discv5_nodeInfo request received')
      return 'Ultralight-CLI: v0.0.1'
    },
    eth_getBlockByHash: async (params: [string, boolean]) => {
      const [blockHash, includeTransactions] = params
      log(
        `eth_getBlockByHash request received. blockHash: ${blockHash} includeTransactions: ${includeTransactions}`
      )
      // lookup block header in DB and return if found
      const headerlookupKey = getContentId(1, blockHash, 0)
      const bodylookupKey = includeTransactions && getContentId(1, blockHash, 1)
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
        return block
      } catch (err) {
        log(err)
      }
      // If block isn't in local DB, request block from network
      try {
        header = await this._client.contentLookup(0, blockHash)
        body = includeTransactions
          ? await this._client.contentLookup(1, blockHash)
          : rlp.encode([[], []])
        // TODO: Figure out why block body isn't coming back as Uint8Array
        block = reassembleBlock(header as Uint8Array, Uint8Array.from(body as Uint8Array))
        return block
      } catch { }

      return 'Block not found'
    },
    portal_addBootNode: async (params: [string]) => {
      const [enr] = params
      const encodedENR = ENR.decodeTxt(enr)
      log(`portal_addBootNode request received for NodeID: ${encodedENR.nodeId.slice(0, 15)}...`)
      const res = await this._client.sendPing(enr, SubNetworkIds.HistoryNetwork)
      return res?.enrSeq ? `ENR added for ${encodedENR.nodeId.slice(0, 15)}...` : 'Node not found'
    },
    portal_addBlockToHistory: async (params: [string, string]) => {
      const [blockHash, rlpHex] = params
      try {
        addRLPSerializedBlock(rlpHex, blockHash, this._client)
        return `blockheader for ${blockHash} added to content DB`
      } catch (err: any) {
        log(`Error trying to load block to DB. ${err.message.toString()}`)
        return `internal error`
      }
    },
    portal_nodeEnr: async () => {
      const enr = this._client.client.enr.encodeTxt()
      return enr
    },
  }

  constructor(client: PortalNetwork) {
    this._client = client
  }

  public getMethods() {
    return this._methods
  }
}
