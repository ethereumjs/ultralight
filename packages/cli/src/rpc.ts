import debug from 'debug'
import { PortalNetwork, getContentId, SubNetworkIds } from 'portalnetwork'

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
      log(`portal_addBootNode request received. enr: ${enr.slice(0, 15)}...`)
      const res = await this._client.sendPing(enr, SubNetworkIds.HistoryNetwork)
      log(res?.enrSeq)
      return res?.enrSeq ? 'node added' : 'node not found'
    },
  }

  constructor(client: PortalNetwork) {
    this._client = client
  }

  public getMethods() {
    return this._methods
  }
}
