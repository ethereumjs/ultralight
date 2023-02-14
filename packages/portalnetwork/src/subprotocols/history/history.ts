import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Debugger } from 'debug'
import {
  BlockHeaderWithProof,
  blockNumberToGindex,
  ContentManager,
  ContentMessageType,
  decodeHistoryNetworkContentKey,
  EpochAccumulator,
  epochIndexByBlocknumber,
  epochRootByBlocknumber,
  epochRootByIndex,
  ETH,
  FindContentMessage,
  getHistoryNetworkContentKey,
  GossipManager,
  HistoryNetworkContentTypes,
  MessageCodes,
  PortalNetwork,
  PortalNetworkMetrics,
  PortalWireMessageType,
  ProtocolId,
  ReceiptsManager,
  RequestCode,
  shortId,
  Witnesses,
} from '../../index.js'

import { BaseProtocol } from '../protocol.js'
import {
  createProof,
  Proof,
  ProofType,
  SingleProof,
  SingleProofInput,
} from '@chainsafe/persistent-merkle-tree'
import { BlockHeader } from '@ethereumjs/block'

enum FoundContent {
  'UTP' = 0,
  'CONTENT' = 1,
  'ENRS' = 2,
}
export class HistoryProtocol extends BaseProtocol {
  verifyInclusionProof(witnesses: Uint8Array[], blockHash: string, blockNumber: bigint): boolean {
    const target = epochRootByIndex(epochIndexByBlocknumber(blockNumber))
    const proof: Proof = {
      type: ProofType.single,
      gindex: blockNumberToGindex(blockNumber),
      witnesses: witnesses,
      leaf: fromHexString(blockHash),
    }
    EpochAccumulator.createFromProof(proof, target)
    return true
  }
  protocolId: ProtocolId
  protocolName = 'HistoryNetwork'
  logger: Debugger
  ETH: ETH
  gossipManager: GossipManager
  contentManager: ContentManager
  public receiptManager: ReceiptsManager
  constructor(client: PortalNetwork, nodeRadius?: bigint, metrics?: PortalNetworkMetrics) {
    super(client, undefined, metrics)
    this.protocolId = ProtocolId.HistoryNetwork
    this.logger = client.logger.extend('HistoryNetwork')
    this.ETH = new ETH(this)
    this.gossipManager = new GossipManager(this)
    this.receiptManager = new ReceiptsManager(this.client.db, this)
    this.contentManager = new ContentManager(this, nodeRadius ?? 4n)
    this.routingTable.setLogger(this.logger)
  }

  /**
   *
   * @param decodedContentMessage content key to be found
   * @returns content if available locally
   */
  public findContentLocally = async (contentKey: Uint8Array) => {
    let value = Uint8Array.from([])
    try {
      //Check to see if value in content db
      value = Buffer.from(fromHexString(await this.client.db.get(toHexString(contentKey))))
    } catch {}
    return value
  }

  public init = async () => {
    this.client.uTP.on('Stream', async (selector, blockHash, content) => {
      if (selector === HistoryNetworkContentTypes.BlockHeader) {
        await this.validateHeader(content, blockHash)
      }
      await this.addContentToHistory(selector, blockHash, content)
    })
  }

  public validateHeader = async (value: Uint8Array, contentHash: string) => {
    const headerProof = BlockHeaderWithProof.deserialize(value as Uint8Array)
    const header = BlockHeader.fromRLPSerializedHeader(Buffer.from(headerProof.header), {
      hardforkByBlockNumber: true,
    })
    const proof = headerProof.proof
    if (proof.value === null) {
      throw new Error('Received block header without proof')
    }
    try {
      this.verifyInclusionProof(proof.value, contentHash, header.number)
    } catch {
      throw new Error('Received block header with invalid proof')
    }
    await this.addContentToHistory(HistoryNetworkContentTypes.BlockHeader, contentHash, value)
  }

  /**
   * Send FINDCONTENT request for content corresponding to `key` to peer corresponding to `dstId`
   * @param dstId node id of peer
   * @param key content key defined by the subprotocol spec
   * @param protocolId subprotocol ID on which content is being sought
   * @returns the value of the FOUNDCONTENT response or undefined
   */
  public sendFindContent = async (dstId: string, key: Uint8Array) => {
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
    this.logger.extend('FINDCONTENT')(`Sending to ${shortId(dstId)}`)
    const res = await this.client.sendPortalNetworkMessage(
      enr,
      Buffer.from(payload),
      this.protocolId
    )
    if (res.length === 0) {
      return undefined
    }

    try {
      if (parseInt(res.slice(0, 1).toString('hex')) === MessageCodes.CONTENT) {
        this.metrics?.contentMessagesReceived.inc()
        this.logger.extend('FOUNDCONTENT')(`Received from ${shortId(dstId)}`)
        const decoded = ContentMessageType.deserialize(res.subarray(1))
        const contentKey = decodeHistoryNetworkContentKey(toHexString(key))
        const contentHash = contentKey.blockHash
        const contentType = contentKey.contentType

        switch (decoded.selector) {
          case FoundContent.UTP: {
            const id = Buffer.from(decoded.value as Uint8Array).readUint16BE()
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
          case FoundContent.CONTENT:
            this.logger(
              `received ${HistoryNetworkContentTypes[contentType]} content corresponding to ${contentHash}`
            )
            try {
              if (contentType === HistoryNetworkContentTypes.BlockHeader) {
                await this.validateHeader(decoded.value as Uint8Array, contentHash)
              } else {
                {
                  await this.addContentToHistory(
                    contentType,
                    toHexString(Buffer.from(contentHash)),
                    decoded.value as Uint8Array
                  )
                }
              }
            } catch {
              this.logger('Error adding content to DB')
            }
            break
          case FoundContent.ENRS: {
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
   * @param contentType - content type of the data item being stored
   * @param hashKey - hex string representation of blockHash or epochHash
   * @param value - hex string representing RLP encoded blockheader, block body, or block receipt
   * @throws if `blockHash` or `value` is not hex string
   */
  public addContentToHistory = async (
    contentType: HistoryNetworkContentTypes,
    hashKey: string,
    value: Uint8Array
  ): Promise<void> => {
    this.contentManager.addContentToHistory(contentType, hashKey, value)
  }

  public generateInclusionProof = async (blockNumber: bigint): Promise<Witnesses> => {
    const epochHash = epochRootByBlocknumber(blockNumber)
    let epoch: string
    try {
      epoch = await this.client.db.get(
        getHistoryNetworkContentKey(HistoryNetworkContentTypes.EpochAccumulator, epochHash)
      )
      const accumulator = EpochAccumulator.deserialize(fromHexString(epoch))
      const tree = EpochAccumulator.value_toTree(accumulator)
      const proofInput: SingleProofInput = {
        type: ProofType.single,
        gindex: blockNumberToGindex(blockNumber),
      }
      const proof = createProof(tree, proofInput) as SingleProof
      return proof.witnesses
    } catch (err: any) {
      throw new Error('Error generating inclusion proof: ' + (err as any).message)
    }
  }
}
