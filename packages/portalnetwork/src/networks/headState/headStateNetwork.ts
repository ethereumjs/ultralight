import type { ENR } from '@chainsafe/enr'
import {
  BaseNetwork,
  type ContentLookupResponse,
  NetworkId,
  type BaseNetworkConfig,
} from '../../index.js'
import debug from 'debug'
import { bytesToUnprefixedHex } from '@ethereumjs/util'
import { distance } from '@chainsafe/discv5'

export class HeadStateNetwork extends BaseNetwork {
  networkName = 'HeadStateNetwork'
  networkId = NetworkId.HeadStateNetwork

  constructor({ client, db, radius, maxStorage }: BaseNetworkConfig) {
    super({ client, networkId: NetworkId.HeadStateNetwork, db, radius, maxStorage })
    this.logger = debug(this.enr.nodeId.slice(0, 5)).extend('Portal').extend('HeadStateNetwork')
    this.routingTable.setLogger(this.logger)
  }

  public interested = (contentId: Uint8Array) => {
    const bits = contentId.length
    const compareId = this.enr.nodeId.slice(0, bits)
    const d = distance(compareId, bytesToUnprefixedHex(contentId))
    return d <= this.nodeRadius
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
