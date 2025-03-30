import { bytesToHex, concatBytes, hexToBytes } from '@ethereumjs/util'
import { genesisData } from '@lodestar/config/networks'
import { getCurrentSlot } from '@lodestar/light-client/utils'
import { ssz } from '@lodestar/types'

import { ContentLookup } from '../contentLookup.js'

import {
  BeaconNetworkContentType,
  LightClientFinalityUpdateKey,
  LightClientOptimisticUpdateKey,
  LightClientUpdatesByRange,
  LightClientUpdatesByRangeKey,
} from './types.js'
import { getBeaconContentKey } from './util.js'

import type { LightClientTransport } from '@lodestar/light-client/transport'
import type { ForkName } from '@lodestar/params'
import type {
  LightClientBootstrap,
  LightClientFinalityUpdate,
  LightClientOptimisticUpdate,
  LightClientUpdate,
} from '@lodestar/types'
import type { Debugger } from 'debug'
import type { BeaconNetwork } from './beacon.js'
import type { LightClientForkName } from './types.js'

export class UltralightTransport implements LightClientTransport {
  network: BeaconNetwork
  logger: Debugger
  constructor(network: BeaconNetwork) {
    this.network = network
    this.logger = network.logger.extend('LightClientTransport')
  }
  async getUpdates(
    startPeriod: number,
    count: number,
  ): Promise<{ version: ForkName; data: LightClientUpdate }[]> {
    const range = []
    this.logger(
      `requesting lightClientUpdatesByRange starting with period ${startPeriod} and count ${count}`,
    )
    while (range.length === 0) {
      const rangeKey = getBeaconContentKey(
        BeaconNetworkContentType.LightClientUpdatesByRange,
        LightClientUpdatesByRangeKey.serialize({
          startPeriod: BigInt(startPeriod),
          count: BigInt(count),
        }),
      )
      let decoded
      decoded = await this.network.findContentLocally(rangeKey)
      if (decoded === undefined || bytesToHex(decoded) === '0x') {
        const res = await this.network.sendFindContent(
          this.network.routingTable.random()!,
          rangeKey,
        )
        if (res !== undefined && 'content' in res)
          decoded = decoded !== undefined ? res.content : undefined
      }
      if (decoded !== undefined) {
        const updateRange = LightClientUpdatesByRange.deserialize(decoded as Uint8Array)
        for (const update of updateRange) {
          const forkhash = update.slice(0, 4)
          const forkname = this.network.beaconConfig.forkDigest2ForkName(
            forkhash,
          ) as LightClientForkName
          range.push({
            version: forkname as ForkName,
            data: ssz[forkname].LightClientUpdate.deserialize(update.slice(4)),
          })
        }
        return range
      }
    }
    throw new Error(`range starting with period ${startPeriod} could not be retrieved`)
  }
  async getOptimisticUpdate(): Promise<{
    version: ForkName
    data: LightClientOptimisticUpdate
  }> {
    let optimisticUpdate, forkname
    const currentSlot = BigInt(
      getCurrentSlot(this.network.beaconConfig, genesisData.mainnet.genesisTime),
    )
    this.logger(`requesting LightClientOptimisticUpdate for ${currentSlot.toString(10)}`)

    // Try to get optimistic update locally
    const localUpdate = await this.network.findContentLocally(
      getBeaconContentKey(
        BeaconNetworkContentType.LightClientOptimisticUpdate,
        LightClientOptimisticUpdateKey.serialize({
          signatureSlot: currentSlot,
        }),
      ),
    )

    if (localUpdate !== undefined && bytesToHex(localUpdate) !== '0x') {
      const forkhash = localUpdate.slice(0, 4) as Uint8Array
      forkname = this.network.beaconConfig.forkDigest2ForkName(forkhash) as LightClientForkName
      optimisticUpdate = ssz[forkname].LightClientOptimisticUpdate.deserialize(localUpdate.slice(4))

      return {
        version: forkname,
        data: optimisticUpdate,
      }
    }

    // Try to get optimistic update from Portal Network
    const decoded = await this.network.sendFindContent(
      this.network.routingTable.random()!,
      concatBytes(
        new Uint8Array([BeaconNetworkContentType.LightClientOptimisticUpdate]),
        LightClientOptimisticUpdateKey.serialize({
          signatureSlot: currentSlot,
        }),
      ),
    )
    if (decoded !== undefined && 'content' in decoded) {
      const forkhash = decoded.content.slice(0, 4) as Uint8Array
      forkname = this.network.beaconConfig.forkDigest2ForkName(forkhash) as LightClientForkName
      optimisticUpdate = ssz[forkname].LightClientOptimisticUpdate.deserialize(
        (decoded.content as Uint8Array).slice(4),
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
    data: LightClientFinalityUpdate
  }> {
    let finalityUpdate, forkname

    const currentFinalitySlot = this.network.lightClient?.getFinalized().beacon.slot
    if (currentFinalitySlot === undefined) {
      throw new Error('Light Client is not running or no Finality Update is available')
    }
    const currentSlot = BigInt(
      getCurrentSlot(this.network.beaconConfig, genesisData.mainnet.genesisTime),
    )
    // Ask for the next possible finality update (or current finality slot if next would still be in the future)
    const nextFinalitySlot =
      currentSlot >= currentFinalitySlot + 32
        ? BigInt(currentFinalitySlot + 32)
        : BigInt(currentFinalitySlot)
    this.logger(`requesting LightClientFinalityUpdate for ${nextFinalitySlot.toString(10)}`)

    // Try retrieving finality update locally
    const localUpdate = await this.network.findContentLocally(
      getBeaconContentKey(
        BeaconNetworkContentType.LightClientFinalityUpdate,
        LightClientFinalityUpdateKey.serialize({
          finalitySlot: nextFinalitySlot,
        }),
      ),
    )

    if (localUpdate !== undefined && bytesToHex(localUpdate) !== '0x') {
      const forkhash = localUpdate.slice(0, 4) as Uint8Array
      forkname = this.network.beaconConfig.forkDigest2ForkName(forkhash) as LightClientForkName
      finalityUpdate = ssz[forkname].LightClientFinalityUpdate.deserialize(localUpdate.slice(4))

      return {
        version: forkname,
        data: finalityUpdate,
      }
    }
    // Try to get finality update from Portal Network
    const decoded = await this.network.sendFindContent(
      this.network.routingTable.random()!,
      concatBytes(
        new Uint8Array([BeaconNetworkContentType.LightClientFinalityUpdate]),
        LightClientFinalityUpdateKey.serialize({ finalitySlot: nextFinalitySlot }),
      ),
    )
    if (decoded !== undefined && 'content' in decoded) {
      const forkhash = decoded.content.slice(0, 4) as Uint8Array
      forkname = this.network.beaconConfig.forkDigest2ForkName(forkhash) as LightClientForkName
      finalityUpdate = ssz[forkname].LightClientFinalityUpdate.deserialize(
        (decoded.content as Uint8Array).slice(4),
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
  ): Promise<{ version: ForkName; data: LightClientBootstrap }> {
    let forkname, bootstrap

    this.logger(`requesting lightClientBootstrap for trusted block root ${blockRoot}`)
    // Try to get bootstrap from Portal Network
    const lookup = new ContentLookup(
      this.network,
      getBeaconContentKey(BeaconNetworkContentType.LightClientBootstrap, hexToBytes(blockRoot)),
    )
    const res = await lookup.startLookup()
    if (res !== undefined && 'content' in res) {
      const forkhash = res.content.slice(0, 4) as Uint8Array
      forkname = this.network.beaconConfig.forkDigest2ForkName(forkhash) as LightClientForkName
      bootstrap = ssz[forkname].LightClientBootstrap.deserialize(res.content.slice(4))
    }

    if (bootstrap === undefined) {
      throw new Error('could not retrieve bootstrap from Portal Network')
    }

    return {
      version: forkname as ForkName,
      data: bootstrap,
    }
  }

  onOptimisticUpdate(handler: (optimisticUpdate: LightClientOptimisticUpdate) => void): void {
    this.network.on('ContentAdded', (contentKey: Uint8Array, content: Uint8Array) => {
      const contentType = contentKey[0]
      if (contentType === BeaconNetworkContentType.LightClientOptimisticUpdate) {
        const forkhash = content.slice(0, 4)
        const forkname = this.network.beaconConfig.forkDigest2ForkName(
          forkhash,
        ) as LightClientForkName
        try {
          handler(ssz[forkname].LightClientOptimisticUpdate.deserialize(content.slice(4)))
        } catch (err) {
          this.logger('something went wrong trying to process Optimistic Update')
          this.logger(err)
        }
      }
    })
  }
  onFinalityUpdate(handler: (finalityUpdate: LightClientFinalityUpdate) => void): void {
    this.network.on('ContentAdded', (contentKey: Uint8Array, content: Uint8Array) => {
      const contentType = contentKey[0]
      if (contentType === BeaconNetworkContentType.LightClientFinalityUpdate) {
        const forkhash = content.slice(0, 4)
        const forkname = this.network.beaconConfig.forkDigest2ForkName(
          forkhash,
        ) as LightClientForkName
        try {
          handler(ssz[forkname].LightClientFinalityUpdate.deserialize(content.slice(4)))
        } catch (err) {
          this.logger('something went wrong trying to process Finality Update')
          this.logger(err)
        }
      }
    })
  }
}
