import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block, BlockHeader } from '@ethereumjs/block'
import { Debugger } from 'debug'
import { ProtocolId } from '../types.js'
import { PortalNetwork } from '../../client/client.js'
import { PortalNetworkMetrics } from '../../client/types.js'
import { shortId } from '../../util/index.js'
import { HeaderAccumulator } from './headerAccumulator.js'
import {
  connectionIdType,
  ContentMessageType,
  FindContentMessage,
  MessageCodes,
  PortalWireMessageType,
} from '../../wire/index.js'
import { RequestCode } from '../../wire/utp/PortalNetworkUtp/PortalNetworkUTP.js'
import { ContentLookup } from '../contentLookup.js'
import { BaseProtocol } from '../protocol.js'
import {
  HistoryNetworkContentTypes,
  HistoryNetworkContentKeyUnionType,
  HeaderAccumulatorType,
  HistoryNetworkContentKey,
  EPOCH_SIZE,
  EpochAccumulator,
} from './types.js'
import { getHistoryNetworkContentId, reassembleBlock } from './util.js'
import * as rlp from 'rlp'
import { CanonicalIndicesProtocol } from '../canonicalIndices/canonicalIndices.js'
export class HistoryProtocol extends BaseProtocol {
  protocolId: ProtocolId
  protocolName: string
  accumulator: HeaderAccumulator
  logger: Debugger
  constructor(client: PortalNetwork, nodeRadius?: bigint, metrics?: PortalNetworkMetrics) {
    super(client, undefined, metrics)
    this.protocolId = ProtocolId.HistoryNetwork
    this.protocolName = 'History Network'
    this.logger = client.logger.extend('HistoryNetwork')
    this.accumulator = new HeaderAccumulator({})
  }

  public init = async () => {
    let storedAccumulator
    try {
      storedAccumulator = await this.client.db.get(
        getHistoryNetworkContentId(1, HistoryNetworkContentTypes.HeaderAccumulator)
      )
    } catch {}

    if (storedAccumulator) {
      const accumulator = HeaderAccumulatorType.deserialize(fromHexString(storedAccumulator))
      this.accumulator = new HeaderAccumulator({
        storedAccumulator: {
          historicalEpochs: accumulator.historicalEpochs,
          currentEpoch: accumulator.currentEpoch,
        },
      })
    } else {
      this.accumulator = new HeaderAccumulator({ initFromGenesis: true })
    }
  }

  /**
   * Starts recursive lookup for content corresponding to `key`
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
            await this.client.uTP.handleNewRequest(
              [key],
              dstId,
              id,
              RequestCode.FINDCONTENT_READ,
              []
            )
            break
          }
          case 1:
            {
              this.logger(`received content`)
              this.logger(decoded.value)
              // Store content in local DB
              switch (decodedKey.selector) {
                case HistoryNetworkContentTypes.BlockHeader:
                case HistoryNetworkContentTypes.BlockBody:
                case HistoryNetworkContentTypes.Receipt:
                  {
                    const content = decodedKey.value as HistoryNetworkContentKey
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
                  const decoded = ContentMessageType.deserialize(res.subarray(1))
                  this.receiveShapshot(decoded.value as Uint8Array)
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

  private receiveShapshot = (decoded: Uint8Array) => {
    try {
      const receivedAccumulator = HeaderAccumulatorType.deserialize(decoded)
      const newAccumulator = new HeaderAccumulator({
        initFromGenesis: false,
        storedAccumulator: {
          historicalEpochs: receivedAccumulator.historicalEpochs,
          currentEpoch: receivedAccumulator.currentEpoch,
        },
      })
      this.logger(
        `Received an accumulator snapshot with ${receivedAccumulator.currentEpoch.length} headers in the current epoch`
      )
      if (this.accumulator.currentHeight() < newAccumulator.currentHeight()) {
        // If we don't have an accumulator, adopt the snapshot received
        // TODO: Decide how to verify if this snapshot is trustworthy
        this.logger(
          'Replacing Accumulator of height',
          this.accumulator.currentHeight(),
          'with Accumulator of height',
          newAccumulator.currentHeight()
        )
        this.accumulator.replaceAccumulator(
          receivedAccumulator.historicalEpochs,
          receivedAccumulator.currentEpoch
        )

        this.client.db.put(
          getHistoryNetworkContentId(1, 4),
          toHexString(HeaderAccumulatorType.serialize(receivedAccumulator))
        )

        const canonicalIndices = this.client.protocols.get(
          ProtocolId.CanonicalIndicesNetwork
        ) as CanonicalIndicesProtocol
        if (canonicalIndices) {
          const accumulatorHeight = this.accumulator.currentHeight()
          const blockIndexHeight = canonicalIndices._blockIndex.length
          if (accumulatorHeight > blockIndexHeight) {
            canonicalIndices.batchUpdate(
              this.accumulator.currentEpoch.map((headerRecord) =>
                toHexString(headerRecord.blockHash)
              ),
              accumulatorHeight
            )
          }
        }
      }
    } catch (err: any) {
      this.logger(`Error parsing accumulator snapshot: ${err.message}`)
    }
  }

  public getBlockByHash = async (
    blockHash: string,
    includeTransactions: boolean
  ): Promise<Block | undefined> => {
    const headerContentKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: 0,
      value: { chainId: 1, blockHash: fromHexString(blockHash) },
    })

    const bodyContentKey = includeTransactions
      ? HistoryNetworkContentKeyUnionType.serialize({
          selector: 1,
          value: { chainId: 1, blockHash: fromHexString(blockHash) },
        })
      : undefined
    let header: any
    let body: any
    let block
    try {
      let lookup = new ContentLookup(this, headerContentKey)
      header = await lookup.startLookup()
      if (!header) {
        undefined
      }
      if (!includeTransactions) {
        block = reassembleBlock(header, rlp.encode([[], []]))
        return block
      } else {
        lookup = new ContentLookup(this, bodyContentKey as Uint8Array)
        body = await lookup.startLookup()
        return new Promise((resolve) => {
          if (body) {
            // Try assembling block
            try {
              block = reassembleBlock(header, body)
              resolve(block)
            } catch {}
          } ///@ts-ignore
          if (body && body.length === 2) {
            // If we got a response that wasn't valid block, assume body lookup returned uTP connection ID and wait for content
            this.client.on('ContentAdded', (key, _type, content) => {
              if (key === blockHash) {
                //@ts-ignore
                block = reassembleBlock(header, fromHexString(content))
                this.client.removeAllListeners('ContentAdded')
                resolve(block)
              }
            })
            setTimeout(() => {
              // Body lookup didn't return within 2 seconds so timeout and return header
              this.client.removeAllListeners('ContentAdded')
              block = reassembleBlock(header, rlp.encode([[], []]))
              resolve(block)
            }, 2000)
          } else {
            // Assume we weren't able to find the block body and just return the header
            block = reassembleBlock(header, rlp.encode([[], []]))
            resolve(block)
          }
        })
      }
    } catch {}
  }

  public getBlockByNumber = async (blockNumber: number, includeTransactions: boolean) => {
    const canonicalIndices = this.client.protocols.get(
      ProtocolId.CanonicalIndicesNetwork
    ) as CanonicalIndicesProtocol
    const blockHash = canonicalIndices.blockHash(blockNumber)
    if (!blockHash) {
      this.logger(`No block hash found in Block Index for ${blockNumber}`)
      return
    }
    // TODO: Request block number from the Canonical Indices protocol if we don't have it locally

    const history = this.client.protocols.get(ProtocolId.HistoryNetwork) as never as HistoryProtocol
    const block = await history.getBlockByHash(blockHash, includeTransactions)
    return block
  }

  /**
   * Convenience method to add content for the History Network to the DB
   * @param chainId - decimal number representing chain Id
   * @param hashKey - hex string representation of blockHash or epochHash
   * @param contentType - content type of the data item being stored
   * @param value - hex string representing RLP encoded blockheader, block body, or block receipt
   * @throws if `blockHash` or `value` is not hex string
   */
  public addContentToHistory = async (
    chainId: number,
    contentType: HistoryNetworkContentTypes,
    hashKey: string,
    value: Uint8Array
  ) => {
    const contentId = getHistoryNetworkContentId(chainId, contentType, hashKey)

    switch (contentType) {
      case HistoryNetworkContentTypes.BlockHeader: {
        try {
          const header = BlockHeader.fromRLPSerializedHeader(Buffer.from(value))
          if (
            header.number.toNumber() === this.accumulator.currentHeight() + 1 &&
            header.parentHash.equals(
              this.accumulator.currentEpoch[this.accumulator.currentEpoch.length - 1].blockHash
            )
          ) {
            if (this.accumulator.currentEpoch.length === EPOCH_SIZE) {
              const currentEpoch = EpochAccumulator.serialize(this.accumulator.currentEpoch)

              const currentEpochHash = toHexString(
                EpochAccumulator.hashTreeRoot(this.accumulator.currentEpoch)
              )
              this.addContentToHistory(
                chainId,
                HistoryNetworkContentTypes.EpochAccumulator,
                currentEpochHash,
                currentEpoch
              )
            }
            // Update the header accumulator if the block header is the next in the chain
            this.accumulator.updateAccumulator(header)
            this.logger(
              `Updated header accumulator at slot ${this.accumulator.currentEpoch.length}/8192 of current Epoch`
            )
            this.client.db.put(
              getHistoryNetworkContentId(1, HistoryNetworkContentTypes.HeaderAccumulator),
              toHexString(HeaderAccumulatorType.serialize(this.accumulator))
            )
          }
          // Try updating the canonical block index when a new header is received
          const canonicalIndices = this.client.protocols.get(
            ProtocolId.CanonicalIndicesNetwork
          ) as CanonicalIndicesProtocol
          if (canonicalIndices) canonicalIndices.incrementBlockIndex(header)
          this.client.db.put(contentId, toHexString(value))
        } catch (err: any) {
          this.logger(`Invalid value provided for block header: ${err.toString()}`)
          return
        }
        break
      }
      case HistoryNetworkContentTypes.BlockBody: {
        let validBlock = false
        try {
          const headerContentId = getHistoryNetworkContentId(
            1,
            HistoryNetworkContentTypes.BlockHeader,
            hashKey
          )
          const hexHeader = await this.client.db.get(headerContentId)
          // Verify we can construct a valid block from the header and body provided
          reassembleBlock(fromHexString(hexHeader), value)
          validBlock = true
        } catch {
          this.logger(
            `Block Header for ${shortId(hashKey)} not found locally.  Querying network...`
          )
          const retrievedHeader = await this.getBlockByHash(hashKey, false)
          try {
            if (retrievedHeader instanceof Block) validBlock = true
          } catch {}
        }
        if (validBlock) {
          this.client.db.put(contentId, toHexString(value))
        } else {
          this.logger(`Could not verify block content`)
          // Don't store block body where we can't assemble a valid block
          return
        }
        break
      }
      case HistoryNetworkContentTypes.Receipt:
        throw new Error('Receipts data not implemented')
      case HistoryNetworkContentTypes.HeaderAccumulator:
        this.client.db.put(getHistoryNetworkContentId(1, 4, hashKey), toHexString(value))
        this.receiveShapshot(value)
        break
      case HistoryNetworkContentTypes.EpochAccumulator:
        this.client.db.put(getHistoryNetworkContentId(1, 3, hashKey), toHexString(value))
        break
      default:
        throw new Error('unknown data type provided')
    }

    this.client.emit('ContentAdded', hashKey, contentType, toHexString(value))
    this.logger(
      `added ${
        Object.keys(HistoryNetworkContentTypes)[
          Object.values(HistoryNetworkContentTypes).indexOf(contentType)
        ]
      } for ${hashKey} to content db`
    )
    if (
      contentType !== HistoryNetworkContentTypes.HeaderAccumulator &&
      this.routingTable.values().length > 0
    ) {
      // Gossip new content to network (except header accumulators)
      this.logger('Gossiping new content to network')
      await this.gossipHistoryNetworkContent(hashKey, contentType)
    }
  }

  /**
   * Gossips recently added content to the nearest 5 nodes
   * @param blockHash hex prefixed blockhash of content to be gossipped
   * @param contentType type of content being gossipped
   */
  private gossipHistoryNetworkContent = async (
    blockHash: string,
    contentType: HistoryNetworkContentTypes
  ) => {
    const contentId = getHistoryNetworkContentId(1, contentType, blockHash)
    const nearestPeers = this.routingTable.nearest(contentId, 5)
    const encodedKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: contentType,
      value: { chainId: 1, blockHash: fromHexString(blockHash) },
    })

    nearestPeers.forEach((peer) => {
      if (!this.routingTable.contentKeyKnownToPeer(peer.nodeId, toHexString(encodedKey))) {
        // If peer hasn't already been OFFERed this contentKey and the content is within the peer's advertised radius, OFFER
        this.logger(`Offering content to ${peer.nodeId.slice(0, 5)}...`)
        this.sendOffer(peer.nodeId, [encodedKey])
      }
    })
  }
}
