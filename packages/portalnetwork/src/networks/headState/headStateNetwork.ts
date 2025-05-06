import type { ENR } from '@chainsafe/enr'
import {
  BaseNetwork,
  type ContentLookupResponse,
  NetworkId,
  type BaseNetworkConfig,
} from '../../index.js'

export class HeadStateNetwork extends BaseNetwork {
  networkName = 'HeadStateNetwork'
  networkId = NetworkId.HeadStateNetwork

  constructor({ client, db, radius, maxStorage }: BaseNetworkConfig) {
    super({ client, networkId: NetworkId.HeadStateNetwork, db, radius, maxStorage })
  }

  store(contentKey: Uint8Array, value: Uint8Array): Promise<void> {
    throw new Error('Method not implemented.')
  }
  public findContentLocally = async (contentKey: Uint8Array): Promise<Uint8Array | undefined> => {
    throw new Error('Method not implemented')
  }
  public sendFindContent = async (
    enr: ENR,
    key: Uint8Array,
  ): Promise<ContentLookupResponse | undefined> => {
    throw new Error('Method not implemented')
  }
}
