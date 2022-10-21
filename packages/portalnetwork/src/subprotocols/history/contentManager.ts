import { toHexString, fromHexString } from '@chainsafe/ssz'
import { BlockHeader, Block } from '@ethereumjs/block'
import { Debugger } from 'debug'
import {
  EpochAccumulator,
  EPOCH_SIZE,
  getHistoryNetworkContentId,
  HistoryNetworkContentTypes,
  HistoryProtocol,
  reassembleBlock,
  SszProof,
  HistoryNetworkContentKeyType,
} from './index.js'
import { ContentLookup } from '../index.js'
import { shortId } from '../../index.js'
import { distance } from '@chainsafe/discv5'

export class ContentManager {
  history: HistoryProtocol
  logger: Debugger
  radius: bigint
  constructor(history: HistoryProtocol, radius: bigint) {
    this.history = history
    this.logger = this.history.logger.extend('ADDING')
    this.radius = radius
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
  ) => {
    const contentId = getHistoryNetworkContentId(contentType, hashKey)

    switch (contentType) {
      case HistoryNetworkContentTypes.BlockHeader: {
        try {
          const header = BlockHeader.fromRLPSerializedHeader(Buffer.from(value), {
            hardforkByBlockNumber: true,
          })
          if (toHexString(header.hash()) !== hashKey) {
            this.logger(`Block header content doesn't match header hash ${hashKey}`)
            return
          }
          const epochIdx = Math.floor(Number(header.number) / 8192)
          if (Object.entries(this.history.accumulator._verifiers).length < 3) {
            this.history.accumulator._verifiers[epochIdx] = header.hash()
          }
          if (Object.entries(this.history.accumulator._verifiers).length >= 3) {
            if (!Object.keys(this.history.accumulator._verifiers).includes(epochIdx.toString())) {
              this.history.accumulator._verifiers[epochIdx] = header.hash()
            }
          }

          if (
            Number(header.number) === this.history.accumulator.currentHeight() + 1 &&
            header.parentHash.equals(
              this.history.accumulator.currentEpoch()[this.history.accumulator.currentHeight()]
                .blockHash
            )
          ) {
            if (this.history.accumulator.currentEpoch.length === EPOCH_SIZE) {
              const currentEpoch = EpochAccumulator.serialize(
                this.history.accumulator.currentEpoch()
              )

              const currentEpochHash = toHexString(
                EpochAccumulator.hashTreeRoot(this.history.accumulator.currentEpoch())
              )
              this.addContentToHistory(
                HistoryNetworkContentTypes.EpochAccumulator,
                currentEpochHash,
                currentEpoch
              )
            }
            this.logger(
              `Updated header accumulator at slot ${
                this.history.accumulator.currentEpoch().length
              }/${EPOCH_SIZE} of current Epoch`
            )
          }
          this.history.client.db.put(contentId, toHexString(value))
        } catch (err: any) {
          this.logger(`Invalid value provided for block header: ${err.toString()}`)
          return
        }
        break
      }
      case HistoryNetworkContentTypes.BlockBody: {
        let validBlock = false
        let block: Block
        try {
          const headerContentId = getHistoryNetworkContentId(
            HistoryNetworkContentTypes.BlockHeader,
            hashKey
          )

          const hexHeader = await this.history.client.db.get(headerContentId)
          // Verify we can construct a valid block from the header and body provided
          block = reassembleBlock(fromHexString(hexHeader), value)
          validBlock = true
        } catch {
          this.logger(
            `Block Header for ${shortId(hashKey)} not found locally.  Querying network...`
          )
          const retrievedHeader = await this.history.ETH.getBlockByHash(hashKey, false)
          try {
            if (retrievedHeader instanceof Block) validBlock = true
          } catch (err) {
            console.log('couldnt find a block')
          }
        }
        if (validBlock) {
          this.history.client.db.put(contentId, toHexString(value))
          await this.history.receiptManager.saveReceipts(block!)
        } else {
          this.logger(`Could not verify block content`)
          // Don't store block body where we can't assemble a valid block
          return
        }
        break
      }
      case HistoryNetworkContentTypes.Receipt:
        this.history.client.db.put(
          getHistoryNetworkContentId(HistoryNetworkContentTypes.Receipt, hashKey),
          toHexString(value)
        )
        break
      case HistoryNetworkContentTypes.EpochAccumulator:
        this.history.client.db.put(
          getHistoryNetworkContentId(HistoryNetworkContentTypes.EpochAccumulator, hashKey),
          toHexString(value)
        )
        break
      case HistoryNetworkContentTypes.HeaderProof: {
        try {
          const proof = SszProof.deserialize(value)
          const verified = await this.history.accumulator.verifyInclusionProof(proof, hashKey)
          this.history.client.emit('Verified', hashKey, verified)
          break
        } catch (err) {
          this.logger(`VERIFY Error: ${(err as any).message}`)
          this.history.client.emit('Verified', hashKey, false)
          break
        }
      }
      default:
        throw new Error('unknown data type provided')
    }
    if (contentType !== HistoryNetworkContentTypes.HeaderProof) {
      this.history.client.emit('ContentAdded', hashKey, contentType, toHexString(value))
      this.logger(
        `added ${
          Object.keys(HistoryNetworkContentTypes)[
            Object.values(HistoryNetworkContentTypes).indexOf(contentType)
          ]
        } for ${hashKey} to content db`
      )
    }
    if (this.history.routingTable.values().length > 0) {
      // Gossip new content to network (except header accumulators)
      this.history.gossipManager.add(hashKey, contentType)
    }
  }

  private async autoLookup(key: Uint8Array, hash: string, type: HistoryNetworkContentTypes) {
    const lookup = new ContentLookup(this.history, key)
    try {
      const content = await lookup.startLookup()
      this.addContentToHistory(type, hash, content as Uint8Array)
    } catch {}
  }

  private receiveEpoch(epoch: Uint8Array) {
    const _epoch = EpochAccumulator.deserialize(epoch).map((record) => {
      return record.blockHash
    })
    for (const hash in _epoch) {
      const headerKey = getHistoryNetworkContentId(HistoryNetworkContentTypes.BlockHeader, hash)
      const bodyKey = getHistoryNetworkContentId(HistoryNetworkContentTypes.BlockBody, hash)
      const headerDistance = distance(this.history.client.discv5.enr.nodeId, headerKey)
      const bodyDistance = distance(this.history.client.discv5.enr.nodeId, bodyKey)
      if (headerDistance <= this.radius) {
        try {
          this.history.client.db.get(headerKey)
        } catch {
          const key = HistoryNetworkContentKeyType.serialize(
            Buffer.concat([
              Uint8Array.from([HistoryNetworkContentTypes.BlockHeader]),
              fromHexString(hash),
            ])
          )
          this.autoLookup(key, hash, HistoryNetworkContentTypes.BlockHeader)
        }
      }
      if (bodyDistance <= this.radius) {
        try {
          this.history.client.db.get(bodyKey)
        } catch {
          const key = HistoryNetworkContentKeyType.serialize(
            Buffer.concat([
              Uint8Array.from([HistoryNetworkContentTypes.BlockBody]),
              fromHexString(hash),
            ])
          )
          this.autoLookup(key, hash, HistoryNetworkContentTypes.BlockBody)
        }
      }
    }
  }
}
