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
  LightClientUpdatesByRangeKey,
  MainnetGenesisTime,
} from './types.js'
import {
  ContentMessageType,
  FindContentMessage,
  MessageCodes,
  OfferMessage,
  PortalWireMessageType,
} from '../../wire/types.js'
import { bytesToInt, concatBytes, padToEven } from '@ethereumjs/util'
import { RequestCode, FoundContent, randUint16, MAX_PACKET_SIZE } from '../../wire/index.js'
import { ssz } from '@lodestar/types'
import { LightClientUpdate } from '@lodestar/types/lib/allForks/types.js'
import { computeSyncPeriodAtSlot } from '@lodestar/light-client/utils'
import { INodeAddress } from '@chainsafe/discv5/lib/session/nodeInfo.js'
import { Lightclient } from '@lodestar/light-client'
import { UltralightTransport } from './ultralightTransport.js'

export class BeaconLightClientNetwork extends BaseProtocol {
  protocolId: ProtocolId.BeaconLightClientNetwork
  beaconConfig: BeaconConfig
  protocolName = 'BeaconLightClientNetwork'
  logger: Debugger
  lightClient: Lightclient | undefined

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

  /**
   * Initializes an Lodestar light client using a trusted beacon block root
   * @param blockRoot trusted beacon block root within the weak subjectivity period for retrieving
   * the `lightClientBootStrap`
   */
  public initializeLightClient = async (blockRoot: string) => {
    const lcLogger = this.logger.extend('LightClient')

    const lcLoggerError = lcLogger.extend('ERROR')
    const lcLoggerWarn = lcLogger.extend('WARN')
    const lcLoggerInfo = lcLogger.extend('INFO')
    const lcLoggerDebug = lcLogger.extend('DEBUG')
    this.lightClient = await Lightclient.initializeFromCheckpointRoot({
      config: this.beaconConfig,
      genesisData: {
        genesisValidatorsRoot: MainnetGenesisValidatorsRoot,
        genesisTime: MainnetGenesisTime,
      },
      transport: new UltralightTransport(this),
      checkpointRoot: fromHexString(blockRoot),
      logger: {
        error: (msg, context, error) => {
          msg && lcLoggerError(msg)
          context && lcLoggerError(context)
          error && lcLoggerError(error)
        },
        warn: (msg, context) => {
          msg && lcLoggerWarn(msg)
          context && lcLoggerWarn(context)
        },
        info: (msg, context) => {
          msg && lcLoggerInfo(msg)
          context && lcLoggerInfo(context)
        },
        debug: (msg, context) => {
          msg && lcLoggerDebug(msg)
          context && lcLoggerDebug(context)
        },
      },
    })
  }

  public findContentLocally = async (contentKey: Uint8Array): Promise<Uint8Array | undefined> => {
    let value
    if (contentKey[0] === BeaconLightClientNetworkContentType.LightClientUpdatesByRange) {
      value = await this.constructLightClientRange(contentKey.slice(1))
    } else {
      value = fromHexString((await this.retrieve(toHexString(contentKey))) ?? '0x')
    }
    return value
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
            decoded = await new Promise((resolve, _reject) => {
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
                  resolve({ selector: 0, value: fromHexString(value) })
                }
              })
            })
            break
          }
          case FoundContent.CONTENT:
            {
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
            break
          case FoundContent.ENRS:
            // We should never get ENRs for content on the Beacon Light Client Network since all nodes
            // are expected to maintain all of the data (basically just light client updates)
            break
        }
        return decoded
      }
      // TODO Should we do anything other than ignore responses to FINDCONTENT messages that isn't a CONTENT response?
    } catch (err: any) {
      this.logger(`Error sending FINDCONTENT to ${shortId(dstId)} - ${err.message}`)
    }
  }

  protected override handleFindContent = async (
    src: INodeAddress,
    requestId: bigint,
    protocol: Uint8Array,
    decodedContentMessage: FindContentMessage,
  ) => {
    this.metrics?.contentMessagesSent.inc()

    this.logger(
      `Received handleFindContent request for contentKey: ${toHexString(
        decodedContentMessage.contentKey,
      )}`,
    )

    const value = await this.findContentLocally(decodedContentMessage.contentKey)
    if (!value || value.length === 0) {
      this.sendResponse(src, requestId, new Uint8Array())
    } else if (value && value.length < MAX_PACKET_SIZE) {
      this.logger(
        'Found value for requested content ' +
          toHexString(decodedContentMessage.contentKey) +
          ' ' +
          toHexString(value.slice(0, 10)) +
          `...`,
      )
      const payload = ContentMessageType.serialize({
        selector: 1,
        value: value,
      })
      this.logger.extend('CONTENT')(`Sending requested content to ${src.nodeId}`)
      this.sendResponse(
        src,
        requestId,
        concatBytes(Uint8Array.from([MessageCodes.CONTENT]), payload),
      )
    } else {
      this.logger.extend('FOUNDCONTENT')(
        'Found value for requested content.  Larger than 1 packet.  uTP stream needed.',
      )
      const _id = randUint16()
      await this.handleNewRequest({
        protocolId: this.protocolId,
        contentKeys: [decodedContentMessage.contentKey],
        peerId: src.nodeId,
        connectionId: _id,
        requestCode: RequestCode.FOUNDCONTENT_WRITE,
        contents: [value],
      })

      const id = new Uint8Array(2)
      new DataView(id.buffer).setUint16(0, _id, false)
      this.logger.extend('FOUNDCONTENT')(`Sent message with CONNECTION ID: ${_id}.`)
      const payload = ContentMessageType.serialize({ selector: FoundContent.UTP, value: id })
      this.sendResponse(
        src,
        requestId,
        concatBytes(Uint8Array.from([MessageCodes.CONTENT]), payload),
      )
    }
  }

  public store = async (
    contentType: BeaconLightClientNetworkContentType,
    contentKey: string,
    value: Uint8Array,
  ): Promise<void> => {
    if (contentType === BeaconLightClientNetworkContentType.LightClientUpdatesByRange) {
      await this.storeUpdateRange(value)
    }
    this.logger(
      `storing ${BeaconLightClientNetworkContentType[contentType]} content corresponding to ${contentKey}`,
    )
    await this.put(this.protocolId, contentKey, toHexString(value))
    this.emit('ContentAdded', contentKey, contentType, toHexString(value))
  }

  /**
   * Specialized store method for the LightClientUpdatesByRange object since this object is not stored
   * directly in the DB but constructed from one or more Light Client Updates which are stored directly
   * @param range an SSZ serialized LightClientUpdatesByRange object as defined in the Portal Network Specs
   */
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
   * @param update An ssz serialized LightClientUpdate as a Uint8Array for a given sync period
   * or the number corresponding to the sync period update desired
   * @returns the hex prefixed string version of the Light Client Update storage key
   * (0x04 + hexidecimal representation of the sync committee period)
   */
  public computeLightClientUpdateKey = (input: Uint8Array | number) => {
    let period
    if (typeof input === 'number') {
      period = input
    } else {
      const forkhash = input.slice(0, 4) as Uint8Array
      const forkname = this.beaconConfig.forkDigest2ForkName(forkhash) as any
      //@ts-ignore - typescript won't let me set `forkname` to a value from of the Forks type
      const deserializedUpdate = ssz[forkname].LightClientUpdate.deserialize(
        input.slice(4),
      ) as LightClientUpdate
      period = computeSyncPeriodAtSlot(deserializedUpdate.attestedHeader.beacon.slot)
    }
    return (
      '0x0' + BeaconLightClientNetworkContentType.LightClientUpdate + padToEven(period.toString(16))
    )
  }

  /**
   * Internal helper called by `findContentLocally` to construct the LightClientUpdatesByRange object as defined in the
   * Portal Network Specs
   * @param contentKey a raw LightClientUpdatesByRange key as defined in the Portal Network Specs (not the content key prefixed with
   * the content type of 1)
   * @returns an SSZ serialized LightClientUpdatesByRange object as a Uint8Array
   */
  private constructLightClientRange = async (contentKey: Uint8Array) => {
    const rangeKey = LightClientUpdatesByRangeKey.deserialize(contentKey)

    if (rangeKey.count > 128n) {
      throw new Error('cannot request more than 128 updates')
    }
    const count = Number(rangeKey.count)
    const start = Number(rangeKey.startPeriod)
    const range = []
    for (let x = start; x < start + count; x++) {
      const update = await this.retrieve(this.computeLightClientUpdateKey(x))
      if (update === undefined) {
        // TODO: Decide what to do about updates not found in DB
        throw new Error('update not found in DB')
      }
      range.push(fromHexString(update))
    }
    return LightClientUpdatesByRange.serialize(range)
  }

  /**
   * We override the BaseProtocol `handleOffer` since content gossip for the Beacon Light client network
   * assumes that all node have all of hthe
   * @param src OFFERing node's address
   * @param requestId request ID passed in OFFER message
   * @param msg OFFER message containing a list of offered content keys
   */
  override handleOffer = async (src: INodeAddress, requestId: bigint, msg: OfferMessage) => {
    this.logger.extend('OFFER')(
      `Received from ${shortId(src.nodeId)} with ${msg.contentKeys.length} pieces of content.`,
    )
    try {
      if (msg.contentKeys.length > 0) {
        let offerAccepted = false

        const contentIds: boolean[] = Array(msg.contentKeys.length).fill(false)

        for (let x = 0; x < msg.contentKeys.length; x++) {
          const key = msg.contentKeys[x]
          switch (key[0]) {
            case BeaconLightClientNetworkContentType.LightClientBootstrap: {
              try {
                // TODO: Verify the offered bootstrap isn't too old before accepting
                await this.get(ProtocolId.BeaconLightClientNetwork, toHexString(key))
                this.logger.extend('OFFER')(`Already have this content ${msg.contentKeys[x]}`)
              } catch (err) {
                offerAccepted = true
                contentIds[x] = true
                this.logger.extend('OFFER')(
                  `Found some interesting content from ${shortId(src.nodeId)}`,
                )
              }
              break
            }
            case BeaconLightClientNetworkContentType.LightClientFinalityUpdate: {
              break
            }
            case BeaconLightClientNetworkContentType.LightClientOptimisticUpdate: {
              break
            }
            case BeaconLightClientNetworkContentType.LightClientUpdatesByRange: {
              break
            }
          }
        }
        if (offerAccepted) {
          this.logger(`Accepting an OFFER`)
          const desiredKeys = msg.contentKeys.filter((k, i) => contentIds[i] === true)
          this.logger(toHexString(msg.contentKeys[0]))
          this.sendAccept(src, requestId, contentIds, desiredKeys)
        } else {
          this.logger(`Declining an OFFER since no interesting content`)
          this.sendResponse(src, requestId, new Uint8Array())
        }
      } else {
        this.logger(`Offer Message Has No Content`)
        // Send empty response if something goes wrong parsing content keys
        this.sendResponse(src, requestId, new Uint8Array())
      }
    } catch {
      this.logger(`Error Processing OFFER msg`)
    }
  }
}
