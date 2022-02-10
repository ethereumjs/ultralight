import { ENR, fromHex, toHex } from '@chainsafe/discv5'
import debug from 'debug'
import { PortalNetwork, getContentId, SubNetworkIds, reassembleBlock } from 'portalnetwork'
import { Block } from '@ethereumjs/block'
import rlp from 'rlp'
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
      const headerlookupKey = getContentId(1, blockHash, 0)
      const bodylookupKey = includeTransactions && getContentId(1, blockHash, 1)
      let value
      try {
        const header = await this._client.db.get(headerlookupKey)
        const body = includeTransactions ? await this._client.db.get(bodylookupKey) : [[], []]
        console.log(header, body)
        value = reassembleBlock(fromHex(header.slice(2)), fromHex(body.slice(2)))
      } catch (err) {
        log(err)
      }
      if (value) {
        return value
      }
      // Request block header from network
      let res
      try {
        res = await this._client.contentLookup(0, blockHash)
      } catch { }

      if (res) {
        return res
      }
      // TODO: Add logic to compile block header and block body into one response since network
      // will return them separately
      return 'Block not found'
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
        await this._client.addContentToHistory(
          1,
          0,
          '0x' + toHex(block.header.hash()),
          block.header.serialize()
        )
        const decodedBlock = rlp.decode(rlpHex)
        await this._client.addContentToHistory(
          1,
          1,
          '0x' + toHex(block.header.hash()),
          rlp.encode([decodedBlock[1], decodedBlock[2]])
        )
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
