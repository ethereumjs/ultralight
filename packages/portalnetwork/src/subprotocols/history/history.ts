import { distance } from '@chainsafe/discv5'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block, BlockHeader } from '@ethereumjs/block'
import debug from 'debug'
import { Debugger } from 'debug'
import { ProtocolId } from '..'
import { PortalNetwork } from '../../client'
import { PortalNetworkMetrics } from '../../client/types'
import { shortId } from '../../util'
import {
  ContentMessageType,
  FindContentMessage,
  MessageCodes,
  PortalWireMessageType,
} from '../../wire'
import { RequestCode } from '../../wire/utp/PortalNetworkUtp/PortalNetworkUTP'
import { ContentLookup } from '../contentLookup'
import { BaseProtocol } from '../protocol'
import { HistoryNetworkContentTypes, HistoryNetworkContentKeyUnionType } from './types'
import { getHistoryNetworkContentId, reassembleBlock } from './util'
import * as rlp from 'rlp'
export class HistoryProtocol extends BaseProtocol {
  protocolId: ProtocolId
  protocolName: string
  logger: Debugger
  constructor(
    client: PortalNetwork,
    nodeRadius: bigint | undefined,
    metrics?: PortalNetworkMetrics
  ) {
    super(client, nodeRadius, metrics)
    this.protocolId = ProtocolId.HistoryNetwork
    this.protocolName = 'History Network'
    this.logger = debug(client.discv5.enr.nodeId.slice(0, 5)).extend('portalnetwork:historyNetwork')
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
    this.logger(`Sending FINDCONTENT to ${shortId(dstId)}`)
    const res = await this.client.sendPortalNetworkMessage(
      enr,
      Buffer.from(payload),
      this.protocolId
    )

    try {
      if (parseInt(res.slice(0, 1).toString('hex')) === MessageCodes.CONTENT) {
        this.metrics?.contentMessagesReceived.inc()
        this.logger(`Received FOUNDCONTENT from ${shortId(dstId)}`)
        // TODO: Switch this to use PortalWireMessageType.deserialize if type inference can be worked out
        const decoded = ContentMessageType.deserialize(res.slice(1))
        switch (decoded.selector) {
          case 0: {
            const id = Buffer.from(decoded.value as Uint8Array).readUInt16BE(0)
            this.logger(`received uTP Connection ID ${id}`)
            await this.client.uTP.handleNewHistoryNetworkRequest(
              [key],
              dstId,
              id,
              RequestCode.FINDCONTENT_READ,
              []
            )
            break
          }
          case 1: {
            this.logger(`received content`)
            this.logger(decoded.value)
            const decodedKey = HistoryNetworkContentKeyUnionType.deserialize(key)
            // Store content in local DB
            try {
              this.addContentToHistory(
                decodedKey.value.chainId,
                decodedKey.selector,
                toHexString(Buffer.from(decodedKey.value.blockHash)),
                decoded.value as Uint8Array
              )
            } catch {
              this.logger('Error adding content to DB')
            }
            break
          }
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
        body = rlp.encode([[], []])
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

  /**
   * Convenience method to add content for the History Network to the DB
   * @param chainId - decimal number representing chain Id
   * @param blockHash - hex string representation of block hash
   * @param contentType - content type of the data item being stored
   * @param value - hex string representing RLP encoded blockheader, block body, or block receipt
   * @throws if `blockHash` or `value` is not hex string
   */
  public addContentToHistory = async (
    chainId: number,
    contentType: HistoryNetworkContentTypes,
    blockHash: string,
    value: Uint8Array
  ) => {
    const contentId = getHistoryNetworkContentId(chainId, blockHash, contentType)

    switch (contentType) {
      case HistoryNetworkContentTypes.BlockHeader: {
        try {
          BlockHeader.fromRLPSerializedHeader(Buffer.from(value))
          this.client.db.put(contentId, toHexString(value), (err: any) => {
            if (err) this.logger(`Error putting content in history DB: ${err.toString()}`)
          })
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
            blockHash,
            HistoryNetworkContentTypes.BlockHeader
          )
          const hexHeader = await this.client.db.get(headerContentId)
          // Verify we can construct a valid block from the header and body provided
          reassembleBlock(fromHexString(hexHeader), value)
          validBlock = true
        } catch {
          this.logger(
            `Block Header for ${shortId(blockHash)} not found locally.  Querying network...`
          )
          const retrievedHeader = await this.getBlockByHash(blockHash, false)
          try {
            if (retrievedHeader instanceof Block) validBlock = true
          } catch {}
        }
        if (validBlock) {
          this.client.db.put(contentId, toHexString(value), (err: any) => {
            if (err) this.logger(`Error putting content in history DB: ${err.toString()}`)
          })
        } else {
          this.logger(`Could not verify block content`)
          // Don't store block body where we can't assemble a valid block
          return
        }
        break
      }
      case HistoryNetworkContentTypes.Receipt:
        throw new Error('Receipts data not implemented')
      default:
        throw new Error('unknown data type provided')
    }

    this.client.emit('ContentAdded', blockHash, contentType, toHexString(value))
    this.logger(
      `added ${
        Object.keys(HistoryNetworkContentTypes)[
          Object.values(HistoryNetworkContentTypes).indexOf(contentType)
        ]
      } for ${blockHash} to content db`
    )
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
    const contentId = getHistoryNetworkContentId(1, blockHash, contentType)
    const nearestPeers = this.routingTable.nearest(contentId, 5)
    const encodedKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: contentType,
      value: { chainId: 1, blockHash: fromHexString(blockHash) },
    })

    nearestPeers.forEach((peer) => {
      if (
        !this.routingTable.contentKeyKnownToPeer(peer.nodeId, toHexString(encodedKey)) &&
        distance(peer.nodeId, contentId) < this.routingTable.getRadius(peer.nodeId)!
        // If peer hasn't already been OFFERed this contentKey and the content is within the peer's advertised radius, OFFER
      ) {
        this.sendOffer(peer.nodeId, [encodedKey])
      }
    })
  }
}
