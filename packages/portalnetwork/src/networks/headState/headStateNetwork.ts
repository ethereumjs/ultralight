import { BaseNetwork, NetworkId, type NetworkConfig } from '../../index.js'

export class HeadStateNetwork extends BaseNetwork {
  networkName = 'HeadStateNetwork'
  networkId = NetworkId.HeadStateNetwork

  constructor(config: NetworkConfig) {
    super(config)
  }
}
