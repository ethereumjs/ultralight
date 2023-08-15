import { fromHexString, toHexString } from '@chainsafe/ssz'
import debug, { Debugger } from 'debug'
import {
  BlockHeaderWithProof,
  blockNumberToGindex,
  ContentMessageType,
  decodeHistoryNetworkContentKey,
  EpochAccumulator,
  epochIndexByBlocknumber,
  epochRootByBlocknumber,
  epochRootByIndex,
  ETH,
  FindContentMessage,
  getContentKey,
  GossipManager,
  HistoryNetworkContentType,
  MessageCodes,
  PortalWireMessageType,
  ProtocolId,
  reassembleBlock,
  RequestCode,
  shortId,
  Witnesses,
  saveReceipts,
  decodeReceipts,
  PortalNetwork,
  FoundContent,
} from '../../index.js'

import { BaseProtocol } from '../protocol.js'
import {
  createProof,
  Proof,
  ProofType,
  SingleProof,
  SingleProofInput,
} from '@chainsafe/persistent-merkle-tree'
import { Block, BlockHeader } from '@ethereumjs/block'
import { bytesToInt } from '@ethereumjs/util'

export class HistoryProtocol extends BaseProtocol {
  protocolId: ProtocolId.HistoryNetwork
  protocolName = 'HistoryNetwork'
  logger: Debugger
  ETH: ETH
  gossipManager: GossipManager
  constructor(client: PortalNetwork, nodeRadius?: bigint) {
    super(client, nodeRadius)
    console.log(ProtocolId)
    this.protocolId = ProtocolId.HistoryNetwork
    this.logger = debug(this.enr.nodeId.slice(0, 5)).extend('Portal').extend('HistoryNetwork')
    this.ETH = new ETH(this)
    this.gossipManager = new GossipManager(this)
    this.routingTable.setLogger(this.logger)
  }
  /**
   *
   * @param decodedContentMessage content key to be found
   * @returns content if available locally
   */
  public findContentLocally = async (contentKey: Uint8Array): Promise<Uint8Array> => {
    const value = await this.retrieve(toHexString(contentKey))
    return value ? fromHexString(value) : fromHexString('0x')
  }

  public validateHeader = async (value: Uint8Array, contentHash: string) => {
    const headerProof = BlockHeaderWithProof.deserialize(value)
    const header = BlockHeader.fromRLPSerializedHeader(headerProof.header, {
      setHardfork: true,
    })
    const proof = headerProof.proof

    if (header.number < 15537393n) {
      // Only check for proof if pre-merge block header
      if (proof.value === null) {
        throw new Error('Received block header without proof')
      }
      try {
        this.verifyInclusionProof(proof.value, contentHash, header.number)
      } catch {
        throw new Error('Received block header with invalid proof')
      }
    }
    this.put(
      this.protocolId,
      getContentKey(HistoryNetworkContentType.BlockHeader, fromHexString(contentHash)),
      toHexString(value),
    )
  }

  /**
   * Send FINDCONTENT request for content corresponding to `key` to peer corresponding to `dstId`
   * @param dstId node id of peer
   * @param key content key defined by the subprotocol spec
   * @param protocolId subprotocol ID on which content is being sought
   * @returns the value of the FOUNDCONTENT response or undefined
   */
  public sendFindContent = async (dstId: string, key: Uint8Array) => {
    const enr = this.routingTable.getWithPending(dstId)?.value
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
    const res = await this.sendMessage(enr, payload, this.protocolId)
    if (res.length === 0) {
      return undefined
    }

    try {
      if (bytesToInt(res.slice(0, 1)) === MessageCodes.CONTENT) {
        this.metrics?.contentMessagesReceived.inc()
        this.logger.extend('FOUNDCONTENT')(`Received from ${shortId(dstId)}`)
        const decoded = ContentMessageType.deserialize(res.subarray(1))
        const contentKey = decodeHistoryNetworkContentKey(toHexString(key))
        const contentHash = contentKey.blockHash
        const contentType = contentKey.contentType

        switch (decoded.selector) {
          case FoundContent.UTP: {
            const id = new DataView((decoded.value as Uint8Array).buffer).getUint16(0, false)
            this.logger.extend('FOUNDCONTENT')(`received uTP Connection ID ${id}`)
            await this.handleNewRequest({
              protocolId: this.protocolId,
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
              `received ${HistoryNetworkContentType[contentType]} content corresponding to ${contentHash}`,
            )
            try {
              await this.store(contentType, contentHash, decoded.value as Uint8Array)
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
  public store = async (
    contentType: HistoryNetworkContentType,
    hashKey: string,
    value: Uint8Array,
  ): Promise<void> => {
    if (contentType === HistoryNetworkContentType.BlockBody) {
      await this.addBlockBody(value, hashKey)
    } else if (contentType === HistoryNetworkContentType.BlockHeader) {
      try {
        await this.validateHeader(value, hashKey)
      } catch (err) {
        this.logger(`Error validating header: ${(err as any).message}`)
      }
    } else {
      this.put(
        this.protocolId,
        getContentKey(contentType, fromHexString(hashKey)),
        toHexString(value),
      )
    }
    this.emit('ContentAdded', hashKey, contentType, toHexString(value))
    if (this.routingTable.values().length > 0) {
      // Gossip new content to network (except header accumulators)
      this.gossipManager.add(hashKey, contentType)
    }
    this.logger(`${HistoryNetworkContentType[contentType]} added for ${hashKey}`)
  }

  public async retrieve(contentKey: string): Promise<string | undefined> {
    try {
      const content = await this.get(this.protocolId, contentKey)
      return content
    } catch {
      this.logger('Error retrieving content from DB')
    }
  }

  public async saveReceipts(block: Block) {
    this.logger.extend('BLOCK_BODY')(`added for block #${block.header.number}`)
    const receipts = await saveReceipts(block)
    this.store(HistoryNetworkContentType.Receipt, toHexString(block.hash()), receipts)
    return decodeReceipts(receipts)
  }

  public async addBlockBody(value: Uint8Array, hashKey: string) {
    const bodyKey = getContentKey(HistoryNetworkContentType.BlockBody, fromHexString(hashKey))
    if (value.length === 0) {
      // Occurs when `getBlockByHash` called `includeTransactions` === false
      return
    }
    let block: Block | undefined
    try {
      const headerContentKey = getContentKey(
        HistoryNetworkContentType.BlockHeader,
        fromHexString(hashKey),
      )
      const headerWith = await this.retrieve(headerContentKey)
      const hexHeader = BlockHeaderWithProof.deserialize(fromHexString(headerWith!)).header
      // Verify we can construct a valid block from the header and body provided
      block = reassembleBlock(hexHeader, value)
    } catch {
      this.logger(`Block Header for ${shortId(hashKey)} not found locally.  Querying network...`)
      block = await this.ETH.getBlockByHash(hashKey, false)
    }
    if (block instanceof Block) {
      const bodyContentKey = getContentKey(
        HistoryNetworkContentType.BlockBody,
        fromHexString(hashKey),
      )
      this.put(this.protocolId, bodyContentKey, toHexString(value))
      if (block.transactions.length > 0) {
        await this.saveReceipts(block)
      }
    } else {
      this.logger(`Could not verify block content`)
      // Don't store block body where we can't assemble a valid block
      return
    }
  }

  public generateInclusionProof = async (blockNumber: bigint): Promise<Witnesses> => {
    const epochHash = epochRootByBlocknumber(blockNumber)
    const epoch = await this.retrieve(
      getContentKey(HistoryNetworkContentType.EpochAccumulator, epochHash),
    )
    try {
      const accumulator = EpochAccumulator.deserialize(fromHexString(epoch!))
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

  public verifyInclusionProof(
    witnesses: Uint8Array[],
    blockHash: string,
    blockNumber: bigint,
  ): boolean {
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
}
