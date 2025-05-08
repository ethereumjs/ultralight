import type { BlockHeader } from '@ethereumjs/block'
import { Block, createBlockHeaderFromRLP } from '@ethereumjs/block'
import {
  type PrefixedHexString,
  bytesToHex,
  bytesToInt,
  concatBytes,
  equalsBytes,
  hexToBytes,
} from '@ethereumjs/util'
import debug from 'debug'

import type {
  BaseNetworkConfig,
  BeaconNetwork,
  ContentLookupResponse,
  EphemeralHeaderKeyValues,
  FindContentMessage,
  INodeAddress,
  OfferMessage,
  Version,
} from '../../index.js'
import {
  AcceptCode,
  BiMap,
  ClientInfoAndCapabilities,
  ContentMessageType,
  FoundContent,
  HistoricalSummariesBlockProof,
  HistoricalSummariesBlockProofDeneb,
  HistoryRadius,
  MAX_UDP_PACKET_SIZE,
  MessageCodes,
  PortalWireMessageType,
  RequestCode,
  decodeHistoryNetworkContentKey,
  decodeReceipts,
  encodeClientInfo,
  encodeWithVariantPrefix,
  getTalkReqOverhead,
  randUint16,
  reassembleBlock,
  saveReceipts,
  shortId,
} from '../../index.js'
import { BasicRadius, PingPongPayloadExtensions } from '../../wire/payloadExtensions.js'
import { BaseNetwork } from '../network.js'
import { NetworkId } from '../types.js'
import {
  AccumulatorProofType,
  BlockHeaderWithProof,
  BlockNumberKey,
  CANCUN_BLOCK,
  EphemeralHeaderOfferPayload,
  EphemeralHeaderPayload,
  HistoricalRootsBlockProof,
  HistoryNetworkContentType,
  MERGE_BLOCK,
  SHANGHAI_BLOCK,
  sszReceiptsListType,
} from './types.js'
import {
  getContentKey,
  getEphemeralHeaderDbKey,
  verifyHistoricalRootsHeaderProof,
  verifyHistoricalSummariesHeaderProof,
  verifyPreMergeHeaderProof,
} from './util.js'

import type { ENR } from '@chainsafe/enr'

import { RunStatusCode } from '@lodestar/light-client'
import type { Debugger } from 'debug'
import type { LightClientHeader } from '@lodestar/types/lib/deneb/types.js'

export class HistoryNetwork extends BaseNetwork {
  networkId: NetworkId.HistoryNetwork
  networkName = 'HistoryNetwork'
  logger: Debugger
  public ephemeralHeaderIndex: BiMap<bigint, string> // Map of block number to block hashes
  public blockHashIndex: Map<string, string>
  constructor({ client, db, radius, maxStorage }: BaseNetworkConfig) {
    super({ client, networkId: NetworkId.HistoryNetwork, db, radius, maxStorage })
    this.capabilities = [
      PingPongPayloadExtensions.CLIENT_INFO_RADIUS_AND_CAPABILITIES,
      PingPongPayloadExtensions.HISTORY_RADIUS_PAYLOAD,
    ]
    this.networkId = NetworkId.HistoryNetwork
    this.logger = debug(this.enr.nodeId.slice(0, 5)).extend('Portal').extend('HistoryNetwork')
    this.routingTable.setLogger(this.logger)
    this.blockHashIndex = new Map()
    this.ephemeralHeaderIndex = new BiMap()
  }

  public blockNumberToHash(blockNumber: bigint): Uint8Array | undefined {
    const number = '0x' + blockNumber.toString(16)
    return this.blockHashIndex.has(number)
      ? hexToBytes(this.blockHashIndex.get(number) as PrefixedHexString)
      : undefined
  }

  public blockHashToNumber(blockHash: Uint8Array): bigint | undefined {
    const blockNumber = this.blockHashIndex.get(bytesToHex(blockHash) as PrefixedHexString)
    return blockNumber === undefined ? undefined : BigInt(blockNumber)
  }

  /**
   *
   * @param decodedContentMessage content key to be found
   * @returns content if available locally
   */
  public findContentLocally = async (contentKey: Uint8Array): Promise<Uint8Array | undefined> => {
    const contentType = contentKey[0]
    if (contentType === HistoryNetworkContentType.BlockHeaderByNumber) {
      const blockNumber = decodeHistoryNetworkContentKey(contentKey).keyOpt
      const blockHash = this.blockNumberToHash(<bigint>blockNumber)
      if (blockHash === undefined) {
        return undefined
      }
      const hashKey = getContentKey(HistoryNetworkContentType.BlockHeader, blockHash)
      const value = await this.retrieve(hashKey)
      return value !== undefined ? hexToBytes(value as PrefixedHexString) : undefined
    }

    const value = await this.retrieve(contentKey)
    return value !== undefined ? hexToBytes(value as PrefixedHexString) : undefined
  }

  public indexBlockHash = async (number: bigint, blockHash: string) => {
    const blockNumber = '0x' + number.toString(16)
    this.blockHashIndex.set(blockNumber, blockHash)
    this.blockHashIndex.set(blockHash, blockNumber)
    await this.portal.db.storeBlockIndex(this.blockHashIndex)
  }

  /**
   * Retrieve a blockheader from the DB by hash
   * @param blockHash the hash of the blockheader sought
   * @param asBytes return the header as RLP encoded bytes or as an `@ethereumjs/block` BlockHeader
   * @returns the bytes or Blockheader if found or else undefined
   */
  public getBlockHeaderFromDB = async (
    opt: { blockHash: Uint8Array } | { blockNumber: bigint },
    asBytes = true,
  ): Promise<undefined | (Uint8Array | BlockHeader)> => {
    const contentKey =
      'blockHash' in opt
        ? getContentKey(HistoryNetworkContentType.BlockHeader, opt.blockHash)
        : getContentKey(HistoryNetworkContentType.BlockHeaderByNumber, opt.blockNumber)
    const value = await this.findContentLocally(contentKey)
    if (value === undefined) return undefined
    const header = BlockHeaderWithProof.deserialize(value).header

    return asBytes === true ? header : createBlockHeaderFromRLP(header, { setHardfork: true })
  }

  public getBlockBodyBytes = async (blockHash: Uint8Array): Promise<Uint8Array | undefined> => {
    const contentKey = getContentKey(HistoryNetworkContentType.BlockBody, blockHash)
    const value = await this.retrieve(contentKey)
    return value !== undefined ? hexToBytes(value as PrefixedHexString) : undefined
  }

  /**
   * Convenience function that implements `getBlockByHash` when block is stored locally
   * @param blockHash the hash of the block sought
   * @param includeTransactions whether to include the full transactions or not
   * @returns a block with or without transactions
   * @throws if the block isn't found in the DB
   */
  public getBlockFromDB = async (
    opt: { blockHash: Uint8Array } | { blockNumber: bigint },
    includeTransactions = true,
  ): Promise<Block> => {
    let header = await this.getBlockHeaderFromDB(opt, false)
    if (header === undefined) {
      throw new Error('Block not found')
    }
    header = header as BlockHeader
    let body
    if (includeTransactions) {
      body = await this.getBlockBodyBytes(header.mixHash)
      if (!body) {
        throw new Error('Block body not found')
      }
    }
    return reassembleBlock(header.serialize(), body ?? undefined)
  }

  public validateHeader = async (
    value: Uint8Array,
    validation: { blockHash: string } | { blockNumber: bigint },
  ) => {
    const headerProof = BlockHeaderWithProof.deserialize(value)
    const header = createBlockHeaderFromRLP(headerProof.header, {
      setHardfork: true,
    })
    if ('blockHash' in validation) {
      if (bytesToHex(header.hash()) !== validation.blockHash) {
        throw new Error('Block hash from data does not match block hash provided for validation')
      }
    }
    const proof = headerProof.proof

    if (header.number < MERGE_BLOCK) {
      let deserializedProof: Uint8Array[]
      try {
        deserializedProof = AccumulatorProofType.deserialize(proof)
      } catch (err: any) {
        const msg = `invalid proof for block ${header.number} - ${bytesToHex(header.hash())}`
        this.logger(msg)
        throw new Error(msg)
      }
      let validated = false
      if ('blockHash' in validation) {
        validated = verifyPreMergeHeaderProof(
          deserializedProof,
          validation.blockHash,
          header.number,
        )
      } else {
        validated = verifyPreMergeHeaderProof(
          deserializedProof,
          bytesToHex(header.hash()),
          validation.blockNumber,
        )
      }
      if (!validated) {
        throw new Error('Unable to validate proof for pre-merge header')
      }
    } else if (header.number < SHANGHAI_BLOCK) {
      let deserializedProof: ReturnType<typeof HistoricalRootsBlockProof.deserialize>
      try {
        deserializedProof = HistoricalRootsBlockProof.deserialize(proof)
      } catch (err: any) {
        const msg = `invalid proof for block ${header.number} - ${bytesToHex(header.hash())}`
        this.logger(msg)
        throw new Error(msg)
      }
      let validated = false
      try {
        validated = verifyHistoricalRootsHeaderProof(deserializedProof, header.hash())
      } catch (err: any) {
        const msg = `Unable to validate proof for post-merge header: ${err.message}`
        this.logger(msg)
        throw new Error(msg)
      }
      if (!validated) {
        throw new Error('Unable to validate proof for post-merge header')
      }
    } else {
      // TODO: Check proof slot to ensure header is from previous sync period and handle ephemeral headers separately

      let deserializedProof: ReturnType<
        | typeof HistoricalSummariesBlockProof.deserialize
        | typeof HistoricalSummariesBlockProofDeneb.deserialize
      >
      try {
        if (header.number < CANCUN_BLOCK) {
          deserializedProof = HistoricalSummariesBlockProof.deserialize(proof)
        } else {
          deserializedProof = HistoricalSummariesBlockProofDeneb.deserialize(proof)
        }
      } catch (err: any) {
        this.logger(`invalid proof for block ${bytesToHex(header.hash())}`)
        throw new Error(`invalid proof for block ${bytesToHex(header.hash())}`)
      }
      const beacon = this.portal.network()['0x500c']
      if (beacon !== undefined && beacon.lightClient?.status === RunStatusCode.started) {
        try {
          verifyHistoricalSummariesHeaderProof(
            deserializedProof,
            header.hash(),
            beacon.historicalSummaries,
            beacon.beaconConfig,
          )
          this.logger(`Successfully verified proof for block header ${header.number}`)
        } catch {
          this.logger('Received post-capella block header with invalid proof')
          // TODO: throw new Error('Received post-merge block header with invalid proof')
        }
      } else {
        this.logger(
          'Received post-capella block but Beacon light client is not running so cannot verify proof',
        )
      }
    }
    await this.indexBlockHash(header.number, bytesToHex(header.hash()))
    return header.hash()
  }

  public override pingPongPayload(extensionType: number) {
    let payload: Uint8Array
    switch (extensionType) {
      case PingPongPayloadExtensions.CLIENT_INFO_RADIUS_AND_CAPABILITIES: {
        payload = ClientInfoAndCapabilities.serialize({
          ClientInfo: encodeClientInfo(this.portal.clientInfo),
          DataRadius: this.nodeRadius,
          Capabilities: this.capabilities,
        })
        break
      }
      case PingPongPayloadExtensions.BASIC_RADIUS_PAYLOAD: {
        payload = BasicRadius.serialize({ dataRadius: this.nodeRadius })
        break
      }
      case PingPongPayloadExtensions.HISTORY_RADIUS_PAYLOAD: {
        if (this.networkId !== NetworkId.HistoryNetwork) {
          throw new Error('HISTORY_RADIUS extension not supported on this network')
        }
        payload = HistoryRadius.serialize({
          dataRadius: this.nodeRadius,
          ephemeralHeadersCount: this.ephemeralHeaderIndex.size,
        })
        break
      }
      default: {
        throw new Error(`Unsupported PING extension type: ${extensionType}`)
      }
    }
    return payload
  }
  /**
   * Send FINDCONTENT request for content corresponding to `key` to peer corresponding to `dstId`
   * @param dstId node id of peer
   * @param key content key defined by the subnetwork spec
   * @param networkId subnetwork ID on which content is being sought
   * @returns the value of the FOUNDCONTENT response or undefined
   */
  public sendFindContent = async (enr: ENR, key: Uint8Array) => {
    this.portal.metrics?.findContentMessagesSent.inc()
    const findContentMsg: FindContentMessage = { contentKey: key }
    let version
    try {
      version = await this.portal.highestCommonVersion(enr)
    } catch (e: any) {
      this.logger.extend('error')(e.message)
      return
    }
    const payload = PortalWireMessageType[version].serialize({
      selector: MessageCodes.FINDCONTENT,
      value: findContentMsg,
    })
    this.logger.extend('FINDCONTENT')(`Sending to ${shortId(enr.nodeId)}`)
    const res = await this.sendMessage(enr, payload, this.networkId)

    try {
      if (bytesToInt(res.slice(0, 1)) === MessageCodes.CONTENT) {
        this.portal.metrics?.contentMessagesReceived.inc()
        this.logger.extend('FOUNDCONTENT')(`Received from ${shortId(enr.nodeId)}`)
        const decoded = ContentMessageType.deserialize(res.subarray(1))
        const contentKey = decodeHistoryNetworkContentKey(key)
        const contentType = contentKey.contentType
        let response: ContentLookupResponse
        switch (decoded.selector) {
          case FoundContent.UTP: {
            this.streamingKey(key)
            const id = new DataView((decoded.value as Uint8Array).buffer).getUint16(0, false)
            this.logger.extend('FOUNDCONTENT')(`received uTP Connection ID ${id}`)
            response = await new Promise((resolve, _reject) => {
              // TODO: Figure out how to clear this listener
              this.on('ContentAdded', (contentKey: Uint8Array, value) => {
                if (equalsBytes(contentKey, key) === true) {
                  this.logger.extend('FOUNDCONTENT')(`received content for uTP Connection ID ${id}`)
                  resolve({ content: value, utp: true })
                }
              })
              void this.handleNewRequest({
                networkId: this.networkId,
                contentKeys: [key],
                enr,
                connectionId: id,
                requestCode: RequestCode.FINDCONTENT_READ,
                version,
              })
            })
            break
          }
          case FoundContent.CONTENT:
            this.logger.extend('FOUNDCONTENT')(
              `received ${HistoryNetworkContentType[contentType]} content corresponding to ${contentKey}`,
            )
            try {
              await this.store(key, decoded.value as Uint8Array)
            } catch {
              this.logger.extend('FOUNDCONTENT')('Error adding content to DB')
            }
            response = { content: decoded.value as Uint8Array, utp: false }
            break
          case FoundContent.ENRS: {
            this.logger.extend('FOUNDCONTENT')(`received ${decoded.value.length} ENRs`)
            response = { enrs: decoded.value as Uint8Array[] }
            break
          }
        }
        return response
      }
    } catch (err: any) {
      this.logger(`Error sending FINDCONTENT to ${shortId(enr.nodeId)} - ${err.message}`)
    }
  }

  protected override handleFindContent = async (
    src: INodeAddress,
    requestId: Uint8Array,
    decodedContentMessage: FindContentMessage,
  ) => {
    this.portal.metrics?.contentMessagesSent.inc()

    this.logger(
      `Received FindContent request for contentKey: ${bytesToHex(
        decodedContentMessage.contentKey,
      )}`,
    )

    const contentKey = decodeHistoryNetworkContentKey(decodedContentMessage.contentKey)
    let value: Uint8Array | undefined
    if (contentKey.contentType === HistoryNetworkContentType.EphemeralHeaderFindContent) {
      const ck = contentKey as {
        contentType: HistoryNetworkContentType.EphemeralHeaderFindContent
        keyOpt: EphemeralHeaderKeyValues
      }
      if (ck.keyOpt.ancestorCount < 0 || ck.keyOpt.ancestorCount > 255) {
        const errorMessage = `received invalid ephemeral headers request with invalid ancestorCount: expected 0 <= 255, got ${ck.keyOpt.ancestorCount}`
        this.logger.extend('FOUNDCONTENT')(errorMessage)
        throw new Error(errorMessage)
      }
      this.logger.extend('FOUNDCONTENT')(
        `Received ephemeral headers request for block ${bytesToHex(ck.keyOpt.blockHash)} with ancestorCount ${ck.keyOpt.ancestorCount}`,
      )
      try {
        const payload = await this.assembleEphemeralHeadersPayload(
          ck.keyOpt.blockHash,
          ck.keyOpt.ancestorCount,
        )
        this.logger.extend('FOUNDCONTENT')(
          `Found ${payload.length} headers for ${bytesToHex(ck.keyOpt.blockHash)}, assembling ephemeral headers response to ${shortId(src.nodeId)}`,
        )
        value = payload
      } catch (err: any) {
        if (err.message.includes('Header not found')) {
          this.logger.extend('FOUNDCONTENT').extend('EPHEMERALHEADERS')(
            `Header not found for ${bytesToHex(ck.keyOpt.blockHash)}, sending empty ephemeral headers response to ${shortId(src.nodeId)}`,
          )
        } else {
          this.logger.extend('FOUNDCONTENT').extend('EPHEMERALHEADERS')(
            `Error assembling ephemeral headers response to ${shortId(src.nodeId)}: ${err.message}`,
          )
        }
        const emptyHeaderPayload = EphemeralHeaderPayload.serialize([])
        const messagePayload = ContentMessageType.serialize({
          selector: FoundContent.CONTENT,
          value: emptyHeaderPayload,
        })

        await this.sendResponse(
          src,
          requestId,
          concatBytes(Uint8Array.from([MessageCodes.CONTENT]), messagePayload),
        )
        return
      }
    } else {
      value = await this.findContentLocally(decodedContentMessage.contentKey)
    }
    if (!value) {
      await this.enrResponse(decodedContentMessage.contentKey, src, requestId)
    } else if (
      value instanceof Uint8Array &&
      value.length < MAX_UDP_PACKET_SIZE - getTalkReqOverhead(hexToBytes(this.networkId).byteLength)
    ) {
      this.logger.extend('FOUNDCONTENT')(
        'Found value for requested content ' +
          bytesToHex(decodedContentMessage.contentKey) +
          ' ' +
          bytesToHex(value.slice(0, 10)) +
          '...',
      )
      const payload = ContentMessageType.serialize({
        selector: FoundContent.CONTENT,
        value,
      })
      this.logger.extend('CONTENT')(`Sending requested content to ${src.nodeId}`)
      await this.sendResponse(
        src,
        requestId,
        concatBytes(Uint8Array.from([MessageCodes.CONTENT]), payload),
      )
    } else {
      this.logger.extend('FOUNDCONTENT')(
        'Found value for requested content.  Larger than 1 packet.  uTP stream needed.',
      )
      const _id = randUint16()
      const enr = this.findEnr(src.nodeId)
      if (!enr) {
        this.logger.extend('FOUNDCONTENT')(
          `No ENR found for ${shortId(src.nodeId)}.  Cannot determine version.  Sending ENR response.`,
        )
        await this.enrResponse(decodedContentMessage.contentKey, src, requestId)
        return
      }
      let contents: Uint8Array = value
      const version = await this.portal.highestCommonVersion(enr)
      switch (version) {
        case 0:
          this.logger.extend('FOUNDCONTENT')('Version 0:  Sending content without prefix.')
          break
        case 1: {
          this.logger.extend('FOUNDCONTENT')('Version 1: Encoding content with varint prefix')
          contents = encodeWithVariantPrefix([value])
          this.logger.extend('FOUNDCONTENT')(
            `Value length: ${value.length} Contents length: ${contents.length}`,
          )
        }
      }
      await this.handleNewRequest({
        networkId: this.networkId,
        contentKeys: [decodedContentMessage.contentKey],
        enr,
        connectionId: _id,
        requestCode: RequestCode.FOUNDCONTENT_WRITE,
        contents,
        version,
      })

      const id = new Uint8Array(2)
      new DataView(id.buffer).setUint16(0, _id, false)
      this.logger.extend('FOUNDCONTENT')(`Sent message with CONNECTION ID: ${_id}.`)
      const payload = ContentMessageType.serialize({ selector: FoundContent.UTP, value: id })
      await this.sendResponse(
        src,
        requestId,
        concatBytes(Uint8Array.from([MessageCodes.CONTENT]), payload),
      )
    }
  }

  /**
   * Convenience method to add content for the History Network to the DB
   * @param contentKey - content key of the data item being stored
   * @param value - hex string representing RLP encoded blockheader, block body, or block receipt
   * @throws if `blockHash` or `value` is not hex string
   */
  public store = async (contentKey: Uint8Array, value: Uint8Array): Promise<void> => {
    const contentType = contentKey[0]
    let keyOpt: Uint8Array | bigint = contentKey.slice(1)
    this.logger.extend('STORE')(`Storing ${bytesToHex(contentKey)} (${value.length} bytes)`)
    switch (contentType) {
      case HistoryNetworkContentType.BlockHeader: {
        try {
          await this.validateHeader(value, { blockHash: bytesToHex(keyOpt) })
          await this.put(contentKey, bytesToHex(value))
        } catch (err) {
          this.logger(`Error validating header: ${(err as any).message}`)
          throw err
        }
        break
      }
      case HistoryNetworkContentType.BlockBody: {
        await this.addBlockBody(value, keyOpt)
        break
      }
      case HistoryNetworkContentType.Receipt: {
        try {
          sszReceiptsListType.deserialize(value)
          await this.put(contentKey, bytesToHex(value))
        } catch (err: any) {
          this.logger(`Received invalid bytes as receipt data for ${bytesToHex(keyOpt)}`)
          return
        }
        break
      }
      case HistoryNetworkContentType.BlockHeaderByNumber: {
        const { blockNumber } = BlockNumberKey.deserialize(keyOpt)
        try {
          const blockHash = await this.validateHeader(value, { blockNumber })
          // Store block header using 0x00 key type
          const hashKey = getContentKey(HistoryNetworkContentType.BlockHeader, blockHash)
          await this.put(hashKey, bytesToHex(value))
          // Switch keyOpt to blockNumber for gossip purposes
          keyOpt = blockNumber
        } catch (err) {
          this.logger(`Error validating header: ${(err as any).message}`)
        }
        break
      }

      case HistoryNetworkContentType.EphemeralHeaderFindContent: {
        const payload = EphemeralHeaderPayload.deserialize(value)
        if (payload.length === 0) {
          this.logger.extend('STORE')('Received empty ephemeral header payload')
          return
        }
        try {
          // Verify first header matches requested header
          const firstHeader = createBlockHeaderFromRLP(payload[0], { setHardfork: true })
          const requestedHeaderHash = decodeHistoryNetworkContentKey(contentKey)
            .keyOpt as EphemeralHeaderKeyValues
          if (equalsBytes(firstHeader.hash(), requestedHeaderHash.blockHash) === false) {
            // TODO: Should we ban/mark down the score of peers who send junk payload?
            const errorMessage = `invalid ephemeral header payload; requested ${bytesToHex(requestedHeaderHash.blockHash)}, got ${bytesToHex(firstHeader.hash())}`
            this.logger(errorMessage)
            throw new Error(errorMessage)
          }
          const hashKey = getEphemeralHeaderDbKey(firstHeader.hash())
          await this.put(hashKey, bytesToHex(payload[0]))
          // Index ephemeral header by block number
          this.ephemeralHeaderIndex.set(firstHeader.number, bytesToHex(firstHeader.hash()))
          let prevHeader = firstHeader
          // Should get maximum of 256 headers
          // TODO: Should we check this and ban/mark down the score of peers who violate this rule?
          for (const header of payload.slice(1, 256)) {
            const ancestorHeader = createBlockHeaderFromRLP(header, { setHardfork: true })
            if (equalsBytes(prevHeader.parentHash, ancestorHeader.hash()) === true) {
              // Verify that ancestor header matches parent hash of previous header
              const hashKey = getEphemeralHeaderDbKey(ancestorHeader.hash())
              await this.put(hashKey, bytesToHex(header))
              // Index ephemeral header by block number
              this.ephemeralHeaderIndex.set(
                ancestorHeader.number,
                bytesToHex(ancestorHeader.hash()),
              )
              prevHeader = ancestorHeader
            } else {
              const errorMessage = `invalid ephemeral header payload; expected parent hash ${bytesToHex(ancestorHeader.parentHash)} but got ${bytesToHex(prevHeader.hash())}`
              this.logger(errorMessage)
              throw new Error(errorMessage)
            }
          }
          break
        } catch (err: any) {
          this.logger(`Error validating ephemeral header: ${err.message}`)
          return
        }
      }
      case HistoryNetworkContentType.EphemeralHeaderOffer: {
        const payload = EphemeralHeaderOfferPayload.deserialize(value)
        const header = createBlockHeaderFromRLP(payload.header, { setHardfork: true })
        // Check if we already have this header
        if (this.ephemeralHeaderIndex.getByValue(bytesToHex(header.hash())) !== undefined) {
          this.logger.extend('STORE')(
            `Ephemeral header ${bytesToHex(header.hash())} already exists`,
          )
          return
        }
        const hashKey = getEphemeralHeaderDbKey(header.hash())
        await this.put(hashKey, bytesToHex(header.serialize()))
        this.ephemeralHeaderIndex.set(header.number, bytesToHex(header.hash()))
        break
      }
    }

    this.emit('ContentAdded', contentKey, value)
    if (this.routingTable.values().length > 0) {
      if (contentType !== HistoryNetworkContentType.EphemeralHeader && contentType !== HistoryNetworkContentType.EphemeralHeaderOffer && contentType !== HistoryNetworkContentType.EphemeralHeaderFindContent) {
        // Gossip new content to network except for ephemeral headers
        this.gossipManager.add(contentKey)
      }
    }
    this.logger(
      `${HistoryNetworkContentType[contentType]} added for ${
        keyOpt instanceof Uint8Array ? bytesToHex(keyOpt) : keyOpt
      }`,
    )
  }

  public async saveReceipts(block: Block) {
    this.logger.extend('BLOCK_BODY')(`added for block #${block.header.number}`)
    const receipts = await saveReceipts(block)
    const contentKey = getContentKey(HistoryNetworkContentType.Receipt, block.hash())
    await this.store(contentKey, receipts)
    return decodeReceipts(receipts)
  }

  public async addBlockBody(bodyBytes: Uint8Array, hashKey: Uint8Array, header?: Uint8Array) {
    if (bodyBytes.length === 0) {
      // Occurs when `getBlockByHash` called `includeTransactions` === false
      return
    }
    let block: Block | undefined
    try {
      if (header === undefined) {
        block = await this.portal.ETH.getBlockByHash(hashKey, false)
      } else {
        // Verify we can construct a valid block from the header and body provided
        block = reassembleBlock(header, bodyBytes)
      }
    } catch (err: any) {
      this.logger(
        `Error: ${err?.message} while validating block body for ${shortId(bytesToHex(hashKey))}`,
      )
    }
    const bodyContentKey = getContentKey(HistoryNetworkContentType.BlockBody, hashKey)
    if (block instanceof Block) {
      await this.put(bodyContentKey, bytesToHex(bodyBytes))
      this.emit('ContentAdded', bodyContentKey, bodyBytes)

      // TODO: Decide when and if to build and store receipts.
      //       Doing this here caused a bottleneck when same receipt is gossiped via uTP at the same time.
      // if (block.transactions.length > 0) {
      //   await this.saveReceipts(block)
      // }
    } else {
      this.logger('Could not verify block content')
      this.logger('Adding anyway for testing...')
      await this.put(bodyContentKey, bytesToHex(bodyBytes))
      this.emit('ContentAdded', bodyContentKey, bodyBytes)
      // TODO: Decide what to do here.  We shouldn't be storing block bodies without a corresponding header
      // as it's against spec
      return
    }
  }

  public async getStateRoot(blockNumber: bigint): Promise<Uint8Array | undefined> {
    const block = await this.portal.ETH.getBlockByNumber(blockNumber, false)
    if (block === undefined) {
      this.logger.extend('getStateRoot')('Block not found')
      return undefined
    }
    return block.header.stateRoot
  }

  /**
   * Assembles an ephemeral header FINDCONTENT payload for a given block hash and ancestor count
   * @param blockHash - The hash of the block to assemble the payload for
   * @param ancestorCount - The number of ancestor headers to include in the payload
   * @returns The assembled ephemeral header payload
   */
  public async assembleEphemeralHeadersPayload(
    blockHash: Uint8Array,
    ancestorCount: number,
  ): Promise<Uint8Array> {
    const headers: Uint8Array[] = []
    const header = await this.get(getEphemeralHeaderDbKey(blockHash))
    if (header === undefined) {
      throw new Error('Header not found')
    }
    this.logger.extend('FOUNDCONTENT').extend('EPHEMERALHEADERS')(
      `Found requested header for ${bytesToHex(blockHash)}`,
    )
    headers.push(hexToBytes(header as PrefixedHexString))
    if (ancestorCount === 0) {
      return EphemeralHeaderPayload.serialize(headers)
    }
    let ancestorNumber = this.ephemeralHeaderIndex.getByValue(bytesToHex(blockHash))
    for (let i = 0; i < ancestorCount; i++) {
      if (ancestorNumber === undefined) {
        break
      }
      ancestorNumber--
      // TODO: Decide if this is safe or if we should retrieve each header from the DB and step back using the parent hash (which would be less efficient)
      const ancestorHashKey = getEphemeralHeaderDbKey(
        hexToBytes(this.ephemeralHeaderIndex.getByKey(ancestorNumber)! as PrefixedHexString),
      )
      const ancestorHeader = await this.get(ancestorHashKey)
      if (ancestorHeader === undefined) {
        break
      }
      headers.push(hexToBytes(ancestorHeader as PrefixedHexString))
    }
    this.logger.extend('FOUNDCONTENT').extend('EPHEMERALHEADERS')(
      `Found ${headers.length - 1} ancestor headers out of ${ancestorCount} requested for ${bytesToHex(blockHash)}`,
    )
    return EphemeralHeaderPayload.serialize(headers)
  }

  protected async handleOffer(
    src: INodeAddress,
    requestId: Uint8Array,
    msg: OfferMessage,
    version: Version,
  ) {
    this.logger.extend('ACCEPT')(
      `Received from ${shortId(src.nodeId, this.routingTable)} with ${msg.contentKeys.length
      } pieces of content.`,
    )
    const decodedContentKeys = msg.contentKeys.map(key => decodeHistoryNetworkContentKey(key))
    // Check to see if the first content key is for ephemeral headers.  If so, we expect all
    // content keys to be for ephemeral headers.
    if (decodedContentKeys[0].contentType === HistoryNetworkContentType.EphemeralHeaderOffer) {
      this.logger.extend('OFFER').extend('EPHEMERALHEADERS')('Received offer for ephemeral headers starting with block hash: ' + bytesToHex(decodedContentKeys[0].keyOpt as Uint8Array))
      const contentIds: number[] = Array(msg.contentKeys.length).fill(AcceptCode.GENERIC_DECLINE)
      const desiredContentKeys: Uint8Array[] = []
      let headHash: Uint8Array | undefined
      let headHashIndex = -1
      do {
        for (const key of decodedContentKeys) {
          if (key.contentType !== HistoryNetworkContentType.EphemeralHeaderOffer) {
            this.logger.extend('ACCEPT').extend('EPHEMERALHEADERS')('Received non-ephemeral header in offer for ephemeral headers.  Declining offer.')
            // If we get an offer for ephemeral headers, all offered content keys should be for ephemeral headers
            // TODO: Ban/descore peers who send spec-noncompliant offers
            break
          }
        }
        const beacon = this.portal.networks.get(NetworkId.BeaconChainNetwork) as BeaconNetwork
        if (beacon === undefined || (beacon.lightClient?.status !== RunStatusCode.started && beacon.lightClient?.status !== RunStatusCode.syncing)) {
          // We can't validate ephemeral headers if our light client is not active and/or syncing
          this.logger.extend('ACCEPT').extend('EPHEMERALHEADERS')('Light client is not active and/or syncing.  Declining offer.')
          break
        }
        // TODO: Make this fork safe (and not assume deneb)
        headHash = (beacon.lightClient.getHead() as LightClientHeader).execution.blockHash
        headHashIndex = decodedContentKeys.findIndex((key) => equalsBytes(key.keyOpt as Uint8Array, headHash!))
        if (headHashIndex === -1) {
          // If our known head hash isn't in the request, we can't validate other ephemeral headers so decline
          this.logger.extend('ACCEPT').extend('EPHEMERALHEADERS')('Known head hash not found in offer.  Declining offer.')
          break
        }
        for (let i = headHashIndex; i < decodedContentKeys.length; i++) {
          const key = decodedContentKeys[i]
          if (this.ephemeralHeaderIndex.getByValue(bytesToHex(key.keyOpt as Uint8Array)) === undefined) {
            contentIds[i] = AcceptCode.ACCEPT
            desiredContentKeys.push(msg.contentKeys[i])
          }
        }
        this.logger.extend('ACCEPT').extend('EPHEMERALHEADERS')(`Sending accept for ${desiredContentKeys.length} desired headers`)
        // biome-ignore lint/correctness/noConstantCondition: We only want to do `sendAccept` once
      } while (false)

      await this.sendAccept(src, requestId, contentIds, desiredContentKeys, version)

      // Set up gossip parameters
      // 1) Define our gossip function (gossip ephemeral headers to random peers)
      // 2) Set up listener
      // 3) Send accept
      // await new Promise(resolve => {
      //   // We use a custom gossip function here because ephemeral headers cannot be gossiped with other content types
      //   const gossipEphemeralHeaders = async (contentKey: Uint8Array) => {
      //     if (desiredContentKeys.length < 1) {
      //       this.removeListener('ContentAdded', gossipEphemeralHeaders)
      //       resolve(true)
      //       return
      //     }

      //     if (equalsBytes(desiredContentKeys[desiredContentKeys.length - 1], contentKey)) {
      //       // Once we've received the last desired header, gossip all offered ephemeral headers starting with the head hash
      //       // We either already have all of the headers or have received them from this gossip message and the spec calls for 
      //       // us to neighborhood gossip all of these
      //       this.removeListener('ContentAdded', gossipEphemeralHeaders)
      //       const content = []
      //       for (const key of decodedContentKeys.slice(headHashIndex)) {
      //         const value = await this.get(getEphemeralHeaderDbKey(key.keyOpt as Uint8Array))
      //         if (value === undefined) {
      //           // This shouldn't happen but short circuit here to avoid trying to gossip content we don't have
      //           this.logger.extend('GOSSIP').extend('EPHEMERALHEADERS')(`Expected header ${bytesToHex(key.keyOpt as Uint8Array)} not found`)
      //           resolve(false)
      //         }
      //         content.push(hexToBytes(value as PrefixedHexString))
      //       }
      //       const gossipPromises = []
      //       // TODO: Replace 5 with a constant defined in History types once the proper number of peers is defined
      //       for (let i = 0; i < 5; i++) {
      //         let enr: ENR | undefined = this.routingTable.random()
      //         while (enr === undefined) {
      //           enr = this.routingTable.random()
      //         }
      //         const offerKeys = msg.contentKeys.slice(headHashIndex)
      //         gossipPromises.push(this.sendOffer(enr, offerKeys, content))
      //       }

      //       await Promise.allSettled(gossipPromises)
      //       resolve(true)
      //     }
      //   }
      //   this.addListener('ContentAdded', gossipEphemeralHeaders)

      //   if (desiredContentKeys.length < 1) {
      //     // Clean up listener and return early if we don't accept any headers
      //     this.removeListener('ContentAdded', gossipEphemeralHeaders)
      //     return
      //   }
      // })
    } else
      await super.handleOffer(src, requestId, msg, version)
  }
}
