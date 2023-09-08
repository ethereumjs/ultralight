import { LightClientTransport } from '@lodestar/light-client/transport'
import { getCurrentSlot } from '@lodestar/light-client/utils'
import { ForkName } from '@lodestar/params'
import { allForks, ssz } from '@lodestar/types'
import { BeaconLightClientNetwork } from './beacon.js'
import {
  BeaconLightClientNetworkContentType,
  LightClientBootstrapKey,
  LightClientFinalityUpdateKey,
  LightClientOptimisticUpdateKey,
  LightClientUpdatesByRange,
  LightClientUpdatesByRangeKey,
} from './types.js'

import { concatBytes, hexToBytes } from '@ethereumjs/util'
import { genesisData } from '@lodestar/config/networks'

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
    const currentSlot = BigInt(
      getCurrentSlot(this.protocol.beaconConfig, genesisData.mainnet.genesisTime),
    )
    this.protocol.logger(`requesting LightClientOptimisticUpdate for ${currentSlot.toString(10)}`)
    // Try to get optimistic update from Portal Network.  We request an update corresponding to the current slot
    // (i.e. tip of the chain) - 1 as the attested header in the optimistic update "should" be only one slot behind
    // the tip if consensus is working properly and on happy path

    const decoded = await this.protocol.sendFindContent(
      this.protocol.routingTable.random()!.nodeId,
      concatBytes(
        new Uint8Array([BeaconLightClientNetworkContentType.LightClientOptimisticUpdate]),
        LightClientOptimisticUpdateKey.serialize({
          optimisticSlot: currentSlot - 1n,
        }),
      ),
    )
    if (decoded !== undefined) {
      const forkhash = decoded.value.slice(0, 4) as Uint8Array
      forkname = this.protocol.beaconConfig.forkDigest2ForkName(forkhash) as ForkName
      optimisticUpdate = (ssz as any)[forkname].LightClientOptimisticUpdate.deserialize(
        (decoded.value as Uint8Array).slice(4),
      )

      return {
        version: forkname,
        data: optimisticUpdate,
      }
    }
    // TODO: Determine if there is a better process for handling where no update is retrieved
    // since Portal Network only returns optimistic updates by slot (maybe backstep one slot at a time until one
    // is retrieved?)
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
        new Uint8Array([BeaconLightClientNetworkContentType.LightClientFinalityUpdate]),
        LightClientFinalityUpdateKey.serialize({ finalizedSlot: 0n }),
      ),
    )
    if (decoded !== undefined) {
      const forkhash = decoded.value.slice(0, 4) as Uint8Array
      forkname = this.protocol.beaconConfig.forkDigest2ForkName(forkhash) as ForkName
      finalityUpdate = (ssz as any)[forkname].LightClientfinalityUpdate.deserialize(
        (decoded.value as Uint8Array).slice(4),
      )

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
          LightClientBootstrapKey.serialize({ blockHash: hexToBytes(blockRoot) }),
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
    this.protocol.on('ContentAdded', (contentKey, contentType, content) => {
      if (contentType === BeaconLightClientNetworkContentType.LightClientOptimisticUpdate) {
        const value = hexToBytes(content)
        const forkhash = value.slice(0, 4) as Uint8Array
        const forkname = this.protocol.beaconConfig.forkDigest2ForkName(forkhash) as any
        handler(
          (ssz as any)[forkname].LightClientOptimisticUpdate.deserialize(
            (value as Uint8Array).slice(4),
          ),
        )
      }
    })
  }
  onFinalityUpdate(handler: (finalityUpdate: allForks.LightClientFinalityUpdate) => void): void {
    this.protocol.on('ContentAdded', (contentKey, contentType, content) => {
      if (contentType === BeaconLightClientNetworkContentType.LightClientFinalityUpdate) {
        const value = hexToBytes(content)
        const forkhash = value.slice(0, 4) as Uint8Array
        const forkname = this.protocol.beaconConfig.forkDigest2ForkName(forkhash) as any
        handler(
          (ssz as any)[forkname].LightClientFinalityUpdate.deserialize(
            (value as Uint8Array).slice(4),
          ),
        )
      }
    })
  }
}
