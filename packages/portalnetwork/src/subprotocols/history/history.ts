import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Debugger } from 'debug'
import {
  AccumulatorManager,
  connectionIdType,
  ContentMessageType,
  FindContentMessage,
  MessageCodes,
  PortalWireMessageType,
  shortId,
  PortalNetwork,
  RequestCode,
  ProtocolId,
  PortalNetworkMetrics,
  HistoryNetworkContentTypes,
  HistoryNetworkContentKeyUnionType,
  HistoryNetworkContentKey,
  EpochAccumulator,
  HeaderProofInterface,
  ReceiptsManager,
  ContentManager,
  ETH,
  GossipManager,
  getHistoryNetworkContentId,
  SszProof,
  serializedContentKeyToContentId,
} from '../../index.js'

import { BaseProtocol } from '../protocol.js'
export class HistoryProtocol extends BaseProtocol {
  protocolId: ProtocolId
  protocolName = 'HistoryNetwork'
  accumulator: AccumulatorManager
  logger: Debugger
  ETH: ETH
  gossipManager: GossipManager
  contentManager: ContentManager
  public receiptManager: ReceiptsManager
  constructor(client: PortalNetwork, nodeRadius?: bigint, metrics?: PortalNetworkMetrics) {
    super(client, undefined, metrics)
    this.protocolId = ProtocolId.HistoryNetwork
    this.logger = client.logger.extend('HistoryNetwork')
    this.accumulator = new AccumulatorManager({ history: this, initFromGenesis: true })
    this.ETH = new ETH(this)
    this.gossipManager = new GossipManager(this)
    this.receiptManager = new ReceiptsManager(this.client.db, this)
    this.contentManager = new ContentManager(this, nodeRadius ?? 4n)
  }

  /**
   *
   * @param decodedContentMessage content key to be found
   * @returns content if available locally
   */
  public findContentLocally = async (decodedContentMessage: FindContentMessage) => {
    const lookupKey = serializedContentKeyToContentId(decodedContentMessage.contentKey)
    let value = Uint8Array.from([])
    const contentKey = HistoryNetworkContentKeyUnionType.deserialize(
      decodedContentMessage.contentKey
    )
    if (contentKey.selector === HistoryNetworkContentTypes.HeaderProof) {
      try {
        // Create Header Proof
        this.logger(`Creating proof for ${toHexString((contentKey.value as any).blockHash)}`)
        const proof = await this.generateInclusionProof(
          toHexString((contentKey.value as any).blockHash)
        )
        // this.logger(proof)
        value = SszProof.serialize({
          leaf: proof.leaf,
          witnesses: proof.witnesses,
        })
      } catch (err) {
        this.logger(`Unable to generate Proof: ${(err as any).message}`)
      }
    } else {
      try {
        //Check to see if value in content db
        value = Buffer.from(fromHexString(await this.client.db.get(lookupKey)))
      } catch {}
    }
    return value
  }
  public init = async () => {
    this.client.uTP.on('Stream', async (chainId, selector, blockHash, content) => {
      if (selector === HistoryNetworkContentTypes.EpochAccumulator) {
        blockHash = toHexString(
          EpochAccumulator.hashTreeRoot(EpochAccumulator.deserialize(content))
        )
      }
      await this.addContentToHistory(chainId, selector, blockHash, content)
    })
  }

  /**
   * Send FINDCONTENT request for content corresponding to `key` to peer corresponding to `dstId`
   * @param dstId node id of peer
   * @param key content key defined by the subprotocol spec
   * @param protocolId subprotocol ID on which content is being sought
   * @returns the value of the FOUNDCONTENT response or undefined
   */
  public sendFindContent = async (dstId: string, key: Uint8Array) => {
    this.metrics?.findContentMessagesSent.inc()
    const findContentMsg: FindContentMessage = { contentKey: key }
    const payload = PortalWireMessageType.serialize({
      selector: MessageCodes.FINDCONTENT,
      value: findContentMsg,
    })
    const enr = this.routingTable.getValue(dstId)
    if (!enr) {
      this.logger(`No ENR found for ${shortId(dstId)}.  FINDCONTENT aborted.`)
      return
    }
    this.logger.extend('FINDCONTENT')(`Sending to ${shortId(dstId)}`)
    const res = await this.client.sendPortalNetworkMessage(
      enr,
      Buffer.from(payload),
      this.protocolId
    )

    try {
      if (parseInt(res.slice(0, 1).toString('hex')) === MessageCodes.CONTENT) {
        this.metrics?.contentMessagesReceived.inc()
        this.logger.extend('FOUNDCONTENT')(`Received from ${shortId(dstId)}`)
        // TODO: Switch this to use PortalWireMessageType.deserialize if type inference can be worked out
        const decoded = ContentMessageType.deserialize(res.subarray(1))
        const decodedKey = HistoryNetworkContentKeyUnionType.deserialize(key)
        switch (decoded.selector) {
          case 0: {
            const id = connectionIdType.deserialize(decoded.value as Uint8Array)
            this.logger.extend('FOUNDCONTENT')(`received uTP Connection ID ${id}`)
            await this.client.uTP.handleNewRequest({
              contentKeys: [key],
              peerId: dstId,
              connectionId: id,
              requestCode: RequestCode.FINDCONTENT_READ,
              contents: [],
            })
            break
          }
          case 1:
            {
              // Store content in local DB
              switch (decodedKey.selector) {
                case HistoryNetworkContentTypes.BlockHeader:
                case HistoryNetworkContentTypes.BlockBody:
                case HistoryNetworkContentTypes.Receipt:
                case HistoryNetworkContentTypes.EpochAccumulator:
                case HistoryNetworkContentTypes.HeaderProof:
                  {
                    const content = decodedKey.value as HistoryNetworkContentKey
                    this.logger(`received content corresponding to ${content!.blockHash}`)
                    try {
                      this.addContentToHistory(
                        content.chainId,
                        decodedKey.selector,
                        toHexString(Buffer.from(content.blockHash!)),
                        decoded.value as Uint8Array
                      )
                    } catch {
                      this.logger('Error adding content to DB')
                    }
                  }
                  break
                case HistoryNetworkContentTypes.HeaderAccumulator: {
                  this.addContentToHistory(
                    1,
                    decodedKey.selector,
                    getHistoryNetworkContentId(1, 4),
                    decoded.value as Uint8Array
                  )
                  break
                }
              }
            }
            break
          case 2: {
            this.logger(`received ${decoded.value.length} ENRs`)
            break
          }
        }
        return decoded
      }
    } catch (err: any) {
      this.logger(`Error sending FINDCONTENT to ${shortId(dstId)} - ${err.message}`)
    }
  }

  /**
   * Convenience method to add content for the History Network to the DB
   * @param chainId - decimal number representing chain Id
   * @param contentType - content type of the data item being stored
   * @param hashKey - hex string representation of blockHash or epochHash
   * @param value - hex string representing RLP encoded blockheader, block body, or block receipt
   * @throws if `blockHash` or `value` is not hex string
   */
  public addContentToHistory = async (
    chainId: number,
    contentType: HistoryNetworkContentTypes,
    hashKey: string,
    value: Uint8Array
  ): Promise<void> => {
    this.contentManager.addContentToHistory(chainId, contentType, hashKey, value)
  }

  public generateInclusionProof = async (blockHash: string): Promise<HeaderProofInterface> => {
    return this.accumulator.generateInclusionProof(blockHash)
  }
}
