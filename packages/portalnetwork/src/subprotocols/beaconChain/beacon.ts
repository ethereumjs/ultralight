import { Debugger } from 'debug'
import { BaseProtocol } from '../protocol.js'
import { ProtocolId } from '../types.js'
import { PortalNetwork } from '../../client/client.js'
import debug from 'debug'
import { Union } from '@chainsafe/ssz/lib/interface.js'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { shortId } from '../../util/util.js'
import {
  ContentMessageType,
  FindContentMessage,
  MessageCodes,
  PortalWireMessageType,
} from '../../wire/types.js'
import { BeaconLightClientNetworkContentType, LightClientOptimisticUpdate } from './types.js'

export class BeaconLightClientNetwork extends BaseProtocol {
  protocolId: ProtocolId.BeaconLightClientNetwork
  protocolName = 'BeaconLightClientNetwork'
  logger: Debugger
  constructor(client: PortalNetwork, nodeRadius?: bigint) {
    super(client, nodeRadius)
    this.protocolId = ProtocolId.BeaconLightClientNetwork
    this.logger = debug(this.enr.nodeId.slice(0, 5))
      .extend('Portal')
      .extend('BeaconLightClientNetwork')
    this.routingTable.setLogger(this.logger)
  }

  public findContentLocally = async (contentKey: Uint8Array): Promise<Uint8Array | undefined> => {
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
    key: Uint8Array
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
    const res = await this.sendMessage(enr, Buffer.from(payload), this.protocolId)
    if (res.length === 0) {
      return undefined
    }
    try {
      if (parseInt(res.subarray(0, 1).toString('hex')) === MessageCodes.CONTENT) {
        this.metrics?.contentMessagesReceived.inc()
        this.logger.extend('FOUNDCONTENT')(`Received from ${shortId(dstId)}`)
        const decoded = ContentMessageType.deserialize(res.subarray(1))
        const contentHash = toHexString(key)
        switch (decoded.selector) {
          case BeaconLightClientNetworkContentType.LightClientOptimisticUpdate:
            try {
              LightClientOptimisticUpdate.deserialize(decoded.value as Uint8Array)
            } catch (err) {
              this.logger(`received invalid content from ${shortId(dstId)}`)
              break
            }
            this.logger(
              `received ${
                BeaconLightClientNetworkContentType[decoded.selector]
              } content corresponding to ${contentHash}`
            )
            await this.store(decoded.selector, contentHash, decoded.value as Uint8Array)
            break
          default:
            this.logger(
              `received ${
                BeaconLightClientNetworkContentType[decoded.selector]
              } content corresponding to ${contentHash}`
            )
        }
        return decoded
      }
    } catch (err: any) {
      this.logger(`Error sending FINDCONTENT to ${shortId(dstId)} - ${err.message}`)
    }
  }

  public store = async (contentType: any, hashKey: string, value: Uint8Array): Promise<void> => {
    await this.put(this.protocolId, hashKey, toHexString(value))
  }
}
