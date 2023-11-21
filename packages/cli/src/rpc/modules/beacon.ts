import { RunStatusCode } from '@lodestar/light-client'
import { ssz } from '@lodestar/types'
import { type BeaconLightClientNetwork, NetworkId, type PortalNetwork } from 'portalnetwork'

import { INTERNAL_ERROR } from '../error-code.js'
import { middleware } from '../validators.js'

import type { capella } from '@lodestar/types'
import type { Debugger } from 'debug'

const methods = ['beacon_getHead', 'beacon_getFinalized']
/**
 * beacon_* RPC module
 * @memberof module:rpc/modules
 */
export class beacon {
  private _beacon: BeaconLightClientNetwork
  private logger: Debugger
  /**
   * Create beacon_* RPC module
   * @param rpcManager RPC client to which the module binds
   */
  constructor(client: PortalNetwork, logger: Debugger) {
    this._beacon = client.networks.get(
      NetworkId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork
    this.logger = logger.extend('beacon')

    this.methods = middleware(this.methods.bind(this), 0, [])
    this.getHead = middleware(this.getHead.bind(this), 0, [])
    this.getFinalized = middleware(this.getFinalized.bind(this), 0, [])
  }

  async methods(_params: []): Promise<string[]> {
    return methods
  }

  /**
   *
   * @returns the JSON formatted Light Client Header corresponding to the current head block
   * known by the light client
   */
  async getHead(): Promise<Record<string, unknown>> {
    if (
      this._beacon.lightClient === undefined ||
      this._beacon.lightClient.status === RunStatusCode.uninitialized
    ) {
      throw {
        code: INTERNAL_ERROR,
        message: 'light client is not initialized',
      }
    }

    return ssz.capella.LightClientHeader.toJson(
      this._beacon.lightClient!.getHead() as capella.LightClientHeader,
    )
  }

  /**
   * Returns the JSON formatted Light Client Header corresponding to the latest finalized block
   * the light client is aware of
   */
  async getFinalized() {
    if (
      this._beacon.lightClient === undefined ||
      this._beacon.lightClient.status === RunStatusCode.uninitialized
    ) {
      throw {
        code: INTERNAL_ERROR,
        message: 'light client is not initialized',
      }
    }
    return ssz.capella.LightClientHeader.toJson(
      this._beacon.lightClient!.getFinalized() as capella.LightClientHeader,
    )
  }
}
