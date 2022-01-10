import debug from 'debug'
import { PortalNetwork, getContentId } from 'portalnetwork'
import { fromHex } from '@chainsafe/discv5'

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
      const lookupKey = getContentId({ chainId: 1, blockHash: fromHex(blockHash.slice(2)) }, 0)
      const value = await this._client.db.get(lookupKey)
      if (value) {
        return value
      }
      // TODO: Add sendFindContent to this to retrieve from network if not found in local DB
      // TODO: Add logic to compile block header and block body into one response since network
      // will return them separately
      return 'Block not found in DB'
    },
  }

  constructor(client: PortalNetwork) {
    this._client = client
  }

  public getMethods() {
    return this._methods
  }
}
