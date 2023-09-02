import { LightClientTransport } from '@lodestar/light-client/transport'
import { ForkName } from '@lodestar/params'
import { allForks, ssz } from '@lodestar/types'
import { BeaconLightClientNetwork } from './beacon.js'
import {
  BeaconLightClientNetworkContentType,
  LightClientBootstrapKey,
  LightClientOptimisticUpdateKey,
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
      `requesting lightClientUpdatesByRange starting with period ${startPeriod} and count ${count}`,
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
        const updateRange = LightClientUpdatesByRange.deserialize(decoded.value as Uint8Array)
        for (const update of updateRange) {
          const forkhash = update.slice(0, 4)
          const forkname = this.protocol.beaconConfig.forkDigest2ForkName(forkhash) as any
          range.push({
            version: forkname as ForkName,
            data: (ssz as any)[forkname].LightClientUpdate.deserialize(update.slice(4)),
          })
        }
        return range
      }
    }
    throw new Error(`range starting with period ${startPeriod} could not be retrieved`)
  }
  async getOptimisticUpdate(): Promise<{
    version: ForkName
    data: allForks.LightClientOptimisticUpdate
  }> {
    let optimisticUpdate, forkname

    this.protocol.logger('requesting latest LightClientOptimisticUpdate')
    // Try to get optimistic update from Portal Network
    const decoded = await this.protocol.sendFindContent(
      this.protocol.routingTable.random()!.nodeId,
      concatBytes(
        new Uint8Array([BeaconLightClientNetworkContentType.LightClientBootstrap]),
        LightClientOptimisticUpdateKey.serialize({ zero: 0n }),
      ),
    )
    if (decoded !== undefined) {
      const forkhash = decoded.value.slice(0, 4) as Uint8Array
      forkname = this.protocol.beaconConfig.forkDigest2ForkName(forkhash) as ForkName
      optimisticUpdate = (ssz as any)[forkname].LightClientOptimisticUpdate.deserialize(
        (decoded.value as Uint8Array).slice(4),
      )
      // TODO: Compare this update to the current optimistic update found in the DB and see which is better
      return {
        version: forkname,
        data: optimisticUpdate,
      }
    }
    // TODO: Determine best method for finding "best" update
    throw new Error('optimistic update could not be retrieved')
  }
  async getFinalityUpdate(): Promise<{
    version: ForkName
    data: allForks.LightClientFinalityUpdate
  }> {
    let finalityUpdate, forkname

    this.protocol.logger('requesting latest LightClientFinalityUpdate')
    // Try to get finality update from Portal Network
    const decoded = await this.protocol.sendFindContent(
      this.protocol.routingTable.random()!.nodeId,
      concatBytes(
        new Uint8Array([BeaconLightClientNetworkContentType.LightClientBootstrap]),
        LightClientOptimisticUpdateKey.serialize({ zero: 0n }),
      ),
    )
    if (decoded !== undefined) {
      const forkhash = decoded.value.slice(0, 4) as Uint8Array
      forkname = this.protocol.beaconConfig.forkDigest2ForkName(forkhash) as ForkName
      finalityUpdate = (ssz as any)[forkname].LightClientfinalityUpdate.deserialize(
        (decoded.value as Uint8Array).slice(4),
      )
      // TODO: Compare this update to the current finality update found in the DB and see which is better
      return {
        version: forkname,
        data: finalityUpdate,
      }
    }
    // TODO: Determine best method for finding "best" update
    throw new Error('LightClientFinalityUpdate could not be retrieved')
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

  // These methods are not currently implemented because we will handle gossiped updates using the Portal Network
  // OFFER/ACCEPT handlers.  If we add additional channels (e.g. listening to libp2p gossip), we can implement these.
  onOptimisticUpdate(
    _handler: (optimisticUpdate: allForks.LightClientOptimisticUpdate) => void,
  ): void {
    throw new Error('Method not implemented.')
  }
  onFinalityUpdate(_handler: (finalityUpdate: allForks.LightClientFinalityUpdate) => void): void {
    throw new Error('Method not implemented.')
  }
}
