import { LightClientTransport } from '@lodestar/light-client/transport'
import { ForkName } from '@lodestar/params'
import { allForks, ssz } from '@lodestar/types'
import { BeaconLightClientNetwork } from './beacon.js'
import {
  BeaconLightClientNetworkContentType,
  LightClientBootstrapKey,
  LightClientUpdatesByRange,
  LightClientUpdatesByRangeKey,
} from './types.js'
import { fromHexString } from '@chainsafe/ssz'
import { concatBytes } from '@ethereumjs/util'

export class UltralightTransport implements LightClientTransport {
  protocol: BeaconLightClientNetwork

  constructor(protocol: BeaconLightClientNetwork) {
    this.protocol = protocol
  }
  async getUpdates(
    startPeriod: number,
    count: number,
  ): Promise<{ version: ForkName; data: allForks.LightClientUpdate }[]> {
    const range = []
    this.protocol.logger(
      `requesting lightClientUpdate range starting with period ${startPeriod} and count ${count}`,
    )
    while (range.length === 0) {
      const decoded = await this.protocol.sendFindContent(
        this.protocol.routingTable.random()!.nodeId,
        concatBytes(
          new Uint8Array([BeaconLightClientNetworkContentType.LightClientUpdatesByRange]),
          LightClientUpdatesByRangeKey.serialize({
            startPeriod: BigInt(startPeriod),
            count: BigInt(count),
          }),
        ),
      )
      if (decoded !== undefined) {
        const forkhash = decoded.value.slice(0, 4) as Uint8Array
        const forkname = this.protocol.beaconConfig.forkDigest2ForkName(forkhash) as any
        const updateRange = LightClientUpdatesByRange.deserialize(
          (decoded.value as Uint8Array).slice(4),
        )
        for (const update in updateRange) {
          range.push({
            version: forkname as ForkName,
            data: (ssz as any)[forkname].LightClientUpdate.deserialize(update),
          })
        }
        return range
      }
    }
    throw new Error(`range starting with period ${startPeriod} could not be retrieved`)
  }
  getOptimisticUpdate(): Promise<{
    version: ForkName
    data: allForks.LightClientOptimisticUpdate
  }> {
    throw new Error('Method not implemented.')
  }
  getFinalityUpdate(): Promise<{ version: ForkName; data: allForks.LightClientFinalityUpdate }> {
    throw new Error('Method not implemented.')
  }
  async getBootstrap(
    blockRoot: string,
  ): Promise<{ version: ForkName; data: allForks.LightClientBootstrap }> {
    const peers = this.protocol.routingTable.nearest(this.protocol.enr.nodeId, 5)

    let bootstrap, forkname

    this.protocol.logger(`requesting lightClientBootstrap for trusted block root ${blockRoot}`)
    // Try to get bootstrap from Portal Network
    for (const peer of peers) {
      const decoded = await this.protocol.sendFindContent(
        peer.nodeId,
        concatBytes(
          new Uint8Array([BeaconLightClientNetworkContentType.LightClientBootstrap]),
          LightClientBootstrapKey.serialize({ blockHash: fromHexString(blockRoot) }),
        ),
      )
      if (decoded !== undefined) {
        const forkhash = decoded.value.slice(0, 4) as Uint8Array
        forkname = this.protocol.beaconConfig.forkDigest2ForkName(forkhash) as any
        bootstrap = (ssz as any)[forkname].LightClientBootstrap.deserialize(
          (decoded.value as Uint8Array).slice(4),
        )
        break
      }
    }

    // TODO: Add some sort of fallback for getting bootstrap from elsewhere if not found on Portal Network
    return {
      version: forkname as ForkName,
      data: bootstrap,
    }
  }

  onOptimisticUpdate(
    handler: (optimisticUpdate: allForks.LightClientOptimisticUpdate) => void,
  ): void {
    throw new Error('Method not implemented.')
  }
  onFinalityUpdate(handler: (finalityUpdate: allForks.LightClientFinalityUpdate) => void): void {
    throw new Error('Method not implemented.')
  }
}
