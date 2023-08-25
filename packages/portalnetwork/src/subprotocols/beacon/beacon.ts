import { Debugger } from 'debug'
import { BaseProtocol } from '../protocol.js'
import { ProtocolId } from '../types.js'
import { PortalNetwork } from '../../client/client.js'
import debug from 'debug'
import { Union } from '@chainsafe/ssz/lib/interface.js'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { shortId } from '../../util/util.js'
import { createBeaconConfig, defaultChainConfig, BeaconConfig } from '@lodestar/config'
import {
  MainnetGenesisValidatorsRoot,
  BeaconLightClientNetworkContentType,
  LightClientUpdatesByRange,
} from './types.js'
import {
  ContentMessageType,
  FindContentMessage,
  MessageCodes,
  PortalWireMessageType,
} from '../../wire/types.js'
import { bytesToInt, intToHex, padToEven } from '@ethereumjs/util'
import { RequestCode, FoundContent } from '../../wire/index.js'
import { ssz } from '@lodestar/types'
import { LightClientUpdate } from '@lodestar/types/lib/allForks/types.js'
import { computeSyncPeriodAtSlot } from './util.js'
export class BeaconLightClientNetwork extends BaseProtocol {
  protocolId: ProtocolId.BeaconLightClientNetwork
  beaconConfig: BeaconConfig
  protocolName = 'BeaconLightClientNetwork'
  logger: Debugger
  constructor(client: PortalNetwork, nodeRadius?: bigint) {
    super(client, nodeRadius)

    const genesisRoot = fromHexString(MainnetGenesisValidatorsRoot)
    this.beaconConfig = createBeaconConfig(defaultChainConfig, genesisRoot)
    this.protocolId = ProtocolId.BeaconLightClientNetwork
    this.logger = debug(this.enr.nodeId.slice(0, 5))
      .extend('Portal')
      .extend('BeaconLightClientNetwork')
    this.routingTable.setLogger(this.logger)
  }

  public findContentLocally = async (contentKey: Uint8Array): Promise<Uint8Array | undefined> => {
    // TODO: We need to add special handling for LightClientUpdatesByRange since these shouldn't be stored
    // in the DB as a range but individually
    if (contentKey[0] === BeaconLightClientNetworkContentType.LightClientUpdatesByRange) {
      throw new Error('special handling for update ranges not supported yet')
    }
    const value = await this.retrieve(toHexString(contentKey))
    return value ? fromHexString(value) : fromHexString('0x')
  }

  public async retrieve(contentKey: string): Promise<string | undefined> {
    try {
      const content = await this.get(this.protocolId, contentKey)
      return content
    } catch {
      this.logger('Error retrieving content from DB')
    }
  }

  public sendFindContent = async (
    dstId: string,
    key: Uint8Array,
  ): Promise<Union<Uint8Array | Uint8Array[]> | undefined> => {
    const enr = this.routingTable.getValue(dstId)
    if (!enr) {
      this.logger(`No ENR found for ${shortId(dstId)}.  FINDCONTENT aborted.`)
      return
    }
    this.metrics?.findContentMessagesSent.inc()
    const findContentMsg: FindContentMessage = { contentKey: key }
    const payload = PortalWireMessageType.serialize({
      selector: MessageCodes.FINDCONTENT,
      value: findContentMsg,
    })
    const res = await this.sendMessage(enr, payload, this.protocolId)
    if (res.length === 0) {
      return undefined
    }

    try {
      if (bytesToInt(res.subarray(0, 1)) === MessageCodes.CONTENT) {
        this.metrics?.contentMessagesReceived.inc()
        this.logger.extend('FOUNDCONTENT')(`Received from ${shortId(dstId)}`)
        let decoded = ContentMessageType.deserialize(res.subarray(1))
        switch (decoded.selector) {
          case FoundContent.UTP: {
            const id = new DataView((decoded.value as Uint8Array).buffer).getUint16(0, false)
            this.logger.extend('FOUNDCONTENT')(`received uTP Connection ID ${id}`)
            decoded = await new Promise((resolve, reject) => {
              this.handleNewRequest({
                protocolId: this.protocolId,
                contentKeys: [key],
                peerId: dstId,
                connectionId: id,
                requestCode: RequestCode.FINDCONTENT_READ,
                contents: [],
              })
              // TODO: Figure out how to clear this listener
              this.on('ContentAdded', (contentKey, contentType, value) => {
                if (contentKey === toHexString(key)) {
                  resolve(value)
                }
              })
            })
            break
          }
          case FoundContent.CONTENT: {
            const contentKey = toHexString(key)
            const forkhash = decoded.value.slice(0, 4) as Uint8Array
            const forkname = this.beaconConfig.forkDigest2ForkName(forkhash) as any
            switch (key[0]) {
              case BeaconLightClientNetworkContentType.LightClientOptimisticUpdate:
                try {
                  // TODO: Figure out how to use Forks type to limit selector in ssz[forkname] below and make typescript happy
                  ;(ssz as any)[forkname].LightClientOptimisticUpdate.deserialize(
                    (decoded.value as Uint8Array).slice(4),
                  )
                } catch (err) {
                  this.logger(`received invalid content from ${shortId(dstId)}`)
                  break
                }
                this.logger(
                  `received ${
                    BeaconLightClientNetworkContentType[decoded.selector]
                  } content corresponding to ${contentKey}`,
                )
                await this.store(key[0], contentKey, decoded.value as Uint8Array)
                break
              case BeaconLightClientNetworkContentType.LightClientFinalityUpdate:
                try {
                  ;(ssz as any)[forkname].LightClientFinalityUpdate.deserialize(
                    (decoded.value as Uint8Array).slice(4),
                  )
                } catch (err) {
                  this.logger(`received invalid content from ${shortId(dstId)}`)
                  break
                }
                this.logger(
                  `received ${
                    BeaconLightClientNetworkContentType[decoded.selector]
                  } content corresponding to ${contentKey}`,
                )
                await this.store(key[0], contentKey, decoded.value as Uint8Array)
                break
              case BeaconLightClientNetworkContentType.LightClientBootstrap:
                try {
                  ;(ssz as any)[forkname].LightClientBootstrap.deserialize(
                    (decoded.value as Uint8Array).slice(4),
                  )
                } catch (err) {
                  this.logger(`received invalid content from ${shortId(dstId)}`)
                  break
                }
                this.logger(
                  `received ${
                    BeaconLightClientNetworkContentType[decoded.selector]
                  } content corresponding to ${contentKey}`,
                )
                await this.store(key[0], contentKey, decoded.value as Uint8Array)
                break
              case BeaconLightClientNetworkContentType.LightClientUpdatesByRange:
                try {
                  LightClientUpdatesByRange.deserialize((decoded.value as Uint8Array).slice(4))
                } catch (err) {
                  this.logger(`received invalid content from ${shortId(dstId)}`)
                  break
                }
                this.logger(
                  `received ${
                    BeaconLightClientNetworkContentType[decoded.selector]
                  } content corresponding to ${contentKey}`,
                )
                await this.storeUpdateRange(decoded.value as Uint8Array)
                break

              default:
                this.logger(
                  `received ${
                    BeaconLightClientNetworkContentType[decoded.selector]
                  } content corresponding to ${contentKey}`,
                )
                break
            }
          }
        }
        return decoded
      }
      // TODO Should we do anything other than ignore responses to FINDCONTENT messages that isn't a CONTENT response?
    } catch (err: any) {
      this.logger(`Error sending FINDCONTENT to ${shortId(dstId)} - ${err.message}`)
    }
  }

  public store = async (
    contentType: BeaconLightClientNetworkContentType,
    contentKey: string,
    value: Uint8Array,
  ): Promise<void> => {
    if (contentType === BeaconLightClientNetworkContentType.LightClientUpdatesByRange) {
      throw new Error('call storeUpdateRange to store LightClientUpdatesByRange')
    }
    this.logger(
      `storing ${BeaconLightClientNetworkContentType[contentType]} content corresponding to ${contentKey}`,
    )
    await this.put(this.protocolId, contentKey, toHexString(value))
    this.emit('ContentAdded', contentKey, contentType, toHexString(value))
  }

  public storeUpdateRange = async (range: Uint8Array) => {
    const deserializedRange = LightClientUpdatesByRange.deserialize(range)
    for (const update of deserializedRange) {
      await this.store(
        BeaconLightClientNetworkContentType.LightClientUpdate,
        this.computeLightClientUpdateKey(update),
        update,
      )
    }
  }

  /**
   *
   * @param update An ssz serialized LightClientUpdate as a Uint8Array
   * @returns the hex prefixed string version of the Light Client Update storage key (0x04 + hexidecimal representation of the sync committee period)
   */
  public computeLightClientUpdateKey = (update: Uint8Array) => {
    const forkhash = update.slice(0, 4) as Uint8Array
    const forkname = this.beaconConfig.forkDigest2ForkName(forkhash) as any
    //@ts-ignore - typescript won't let me set `forkname` to a value from of the Forks type
    const deserializedUpdate = ssz[forkname].LightClientUpdate.deserialize(
      update.slice(4),
    ) as LightClientUpdate
    return (
      '0x0' +
      BeaconLightClientNetworkContentType.LightClientUpdate +
      padToEven(computeSyncPeriodAtSlot(deserializedUpdate.attestedHeader.beacon.slot).toString(16))
    )
  }
}
