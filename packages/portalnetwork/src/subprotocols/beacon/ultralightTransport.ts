import { LightClientTransport } from '@lodestar/light-client/transport'
import { getCurrentSlot } from '@lodestar/light-client/utils'
import { ForkName } from '@lodestar/params'
import { allForks, ssz } from '@lodestar/types'
import { BeaconLightClientNetwork } from './beacon.js'
import {
  BeaconLightClientNetworkContentType,
  LightClientBootstrapKey,
  LightClientFinalityUpdateKey,
  LightClientForkName,
  LightClientOptimisticUpdateKey,
  LightClientUpdatesByRange,
  LightClientUpdatesByRangeKey,
} from './types.js'
import { Debugger } from 'debug'
import { bytesToHex, concatBytes, hexToBytes } from '@ethereumjs/util'
import { genesisData } from '@lodestar/config/networks'
import { getBeaconContentKey } from './util.js'

export class UltralightTransport implements LightClientTransport {
  protocol: BeaconLightClientNetwork
  logger: Debugger
  constructor(protocol: BeaconLightClientNetwork) {
    this.protocol = protocol
    this.logger = protocol.logger.extend('LightClientTransport')
  }
  async getUpdates(
    startPeriod: number,
    count: number,
  ): Promise<{ version: ForkName; data: allForks.LightClientUpdate }[]> {
    const range = []
    this.logger(
      `requesting lightClientUpdatesByRange starting with period ${startPeriod} and count ${count}`,
    )
    while (range.length === 0) {
      const rangeKey = hexToBytes(
        getBeaconContentKey(
          BeaconLightClientNetworkContentType.LightClientUpdatesByRange,
          LightClientUpdatesByRangeKey.serialize({
            startPeriod: BigInt(startPeriod),
            count: BigInt(count),
          }),
        ),
      )
      let decoded
      decoded = await this.protocol.findContentLocally(rangeKey)
      if (decoded === undefined || bytesToHex(decoded) === '0x') {
        decoded = await this.protocol.sendFindContent(
          this.protocol.routingTable.random()!.nodeId,
          rangeKey,
        )
        decoded = decoded !== undefined ? decoded.value : undefined
      }
      if (decoded !== undefined) {
        const updateRange = LightClientUpdatesByRange.deserialize(decoded as Uint8Array)
        for (const update of updateRange) {
          const forkhash = update.slice(0, 4)
          const forkname = this.protocol.beaconConfig.forkDigest2ForkName(
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
    data: allForks.LightClientOptimisticUpdate
  }> {
    let optimisticUpdate, forkname
    const currentSlot = BigInt(
      getCurrentSlot(this.protocol.beaconConfig, genesisData.mainnet.genesisTime),
    )
    this.logger(`requesting LightClientOptimisticUpdate for ${currentSlot.toString(10)}`)

    // Try to get optimistic update locally
    const localUpdate = await this.protocol.findContentLocally(
      hexToBytes(
        getBeaconContentKey(
          BeaconLightClientNetworkContentType.LightClientOptimisticUpdate,
          LightClientOptimisticUpdateKey.serialize({
            signatureSlot: currentSlot,
          }),
        ),
      ),
    )

    if (localUpdate !== undefined && bytesToHex(localUpdate) !== '0x') {
      const forkhash = localUpdate.slice(0, 4) as Uint8Array
      forkname = this.protocol.beaconConfig.forkDigest2ForkName(forkhash) as LightClientForkName
      optimisticUpdate = ssz[forkname].LightClientOptimisticUpdate.deserialize(localUpdate.slice(4))

      return {
        version: forkname,
        data: optimisticUpdate,
      }
    }

    // Try to get optimistic update from Portal Network
    const decoded = await this.protocol.sendFindContent(
      this.protocol.routingTable.random()!.nodeId,
      concatBytes(
        new Uint8Array([BeaconLightClientNetworkContentType.LightClientOptimisticUpdate]),
        LightClientOptimisticUpdateKey.serialize({
          signatureSlot: currentSlot,
        }),
      ),
    )
    if (decoded !== undefined) {
      const forkhash = decoded.value.slice(0, 4) as Uint8Array
      forkname = this.protocol.beaconConfig.forkDigest2ForkName(forkhash) as LightClientForkName
      optimisticUpdate = ssz[forkname].LightClientOptimisticUpdate.deserialize(
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

    const currentFinalitySlot = this.protocol.lightClient?.getFinalized().beacon.slot
    if (currentFinalitySlot === undefined) {
      throw new Error('Light Client is not running or no Finality Update is available')
    }
    // Ask for the next possible finality update
    const nextFinalitySlot = BigInt(currentFinalitySlot + 32)
    this.logger(`requesting LightClientFinalityUpdate for ${nextFinalitySlot.toString(10)}`)

    // Try retrieving finality update locally
    const localUpdate = await this.protocol.findContentLocally(
      hexToBytes(
        getBeaconContentKey(
          BeaconLightClientNetworkContentType.LightClientFinalityUpdate,
          LightClientFinalityUpdateKey.serialize({
            finalitySlot: nextFinalitySlot,
          }),
        ),
      ),
    )

    if (localUpdate !== undefined && bytesToHex(localUpdate) !== '0x') {
      const forkhash = localUpdate.slice(0, 4) as Uint8Array
      forkname = this.protocol.beaconConfig.forkDigest2ForkName(forkhash) as LightClientForkName
      finalityUpdate = ssz[forkname].LightClientFinalityUpdate.deserialize(localUpdate.slice(4))

      return {
        version: forkname,
        data: finalityUpdate,
      }
    }
    // Try to get finality update from Portal Network
    const decoded = await this.protocol.sendFindContent(
      this.protocol.routingTable.random()!.nodeId,
      concatBytes(
        new Uint8Array([BeaconLightClientNetworkContentType.LightClientFinalityUpdate]),
        LightClientFinalityUpdateKey.serialize({ finalitySlot: nextFinalitySlot }),
      ),
    )
    if (decoded !== undefined) {
      const forkhash = decoded.value.slice(0, 4) as Uint8Array
      forkname = this.protocol.beaconConfig.forkDigest2ForkName(forkhash) as LightClientForkName
      finalityUpdate = ssz[forkname].LightClientFinalityUpdate.deserialize(
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
    let forkname, bootstrap
    const localBootstrap = await this.protocol.findContentLocally(
      hexToBytes(
        getBeaconContentKey(
          BeaconLightClientNetworkContentType.LightClientBootstrap,
          LightClientBootstrapKey.serialize({ blockHash: hexToBytes(blockRoot) }),
        ),
      ),
    )
    if (localBootstrap !== undefined && localBootstrap.length !== 0) {
      this.logger('Found LightClientBootstrap locally.  Initializing light client...')
      try {
        forkname = this.protocol.beaconConfig.forkDigest2ForkName(
          localBootstrap.slice(0, 4),
        ) as LightClientForkName
        bootstrap = ssz[forkname].LightClientBootstrap.deserialize(localBootstrap.slice(4))
      } catch (err) {
        this.logger('Error loading local bootstrap error')
        this.logger(err)
      }
    } else {
      const peers = this.protocol.routingTable.nearest(this.protocol.enr.nodeId, 5)

      let forkname

      this.logger(`requesting lightClientBootstrap for trusted block root ${blockRoot}`)
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
          forkname = this.protocol.beaconConfig.forkDigest2ForkName(forkhash) as LightClientForkName
          bootstrap = ssz[forkname].LightClientBootstrap.deserialize(
            (decoded.value as Uint8Array).slice(4),
          )
          break
        }
      }
    }

    if (bootstrap === undefined) {
      throw new Error('could not retrieve bootstrap from Portal Network')
    }

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
        const forkname = this.protocol.beaconConfig.forkDigest2ForkName(
          forkhash,
        ) as LightClientForkName
        try {
          handler(
            ssz[forkname].LightClientOptimisticUpdate.deserialize((value as Uint8Array).slice(4)),
          )
        } catch (err) {
          this.logger('something went wrong trying to process Optimistic Update')
          this.logger(err)
        }
      }
    })
  }
  onFinalityUpdate(handler: (finalityUpdate: allForks.LightClientFinalityUpdate) => void): void {
    this.protocol.on('ContentAdded', (contentKey, contentType, content) => {
      if (contentType === BeaconLightClientNetworkContentType.LightClientFinalityUpdate) {
        const value = hexToBytes(content)
        const forkhash = value.slice(0, 4) as Uint8Array
        const forkname = this.protocol.beaconConfig.forkDigest2ForkName(
          forkhash,
        ) as LightClientForkName
        try {
          handler(
            ssz[forkname].LightClientFinalityUpdate.deserialize((value as Uint8Array).slice(4)),
          )
        } catch (err) {
          this.logger('something went wrong trying to process Finality Update')
          this.logger(err)
        }
      }
    })
  }
}
