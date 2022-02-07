import { ENR, fromHex, toHex } from '@chainsafe/discv5'
import debug from 'debug'
import { PortalNetwork, getContentId, SubNetworkIds } from 'portalnetwork'
import { Block } from '@ethereumjs/block'
const log = debug('RPC')

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
      const lookupKey = getContentId(1, blockHash, 0)
      const value = await this._client.db.get(lookupKey)
      if (value) {
        return value
      }
      // TODO: Add sendFindContent to this to retrieve from network if not found in local DB
      // TODO: Add logic to compile block header and block body into one response since network
      // will return them separately
      return 'Block not found in DB'
    },
    portal_addBootNode: async (params: [string]) => {
      const [enr] = params
      const encodedENR = ENR.decodeTxt(enr)
      log(`portal_addBootNode request received for NodeID: ${encodedENR.nodeId.slice(0, 15)}...`)
      const res = await this._client.sendPing(enr, SubNetworkIds.HistoryNetwork)
      return res?.enrSeq ? `ENR added for ${encodedENR.nodeId.slice(0, 15)}...` : 'Node not found'
    },
    portal_addBlockToHistory: async (params: [string]) => {
      const [rlpHex] = params
      try {
        const block = Block.fromRLPSerializedBlock(fromHex(rlpHex.slice(2)))
        this._client.addContentToHistory(1, 1, '0x' + toHex(block.header.hash()), rlpHex)
        return `blockheader for ${'0x' + toHex(block.header.hash())} added to content DB`
      } catch (err: any) {
        log(`Error trying to load block to DB. ${err.message.toString()}`)
        return `internal error`
      }
    },
  }

  constructor(client: PortalNetwork) {
    this._client = client
  }

  public getMethods() {
    return this._methods
  }
}
