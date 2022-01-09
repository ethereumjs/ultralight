import debug from 'debug'
import { PortalNetwork } from 'portalnetwork'

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
      return 'Ultralight-CLI: v0.0.1'
    },
  }

  constructor(client: PortalNetwork) {
    this._client = client
  }

  public getMethods() {
    return this._methods
  }
}
