import { digest } from '@chainsafe/as-sha256'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { HistoryNetworkContentKeyUnionType } from './index.js'
import {
  BlockBodyContentType,
  HistoryNetworkContentTypes,
  sszTransaction,
  sszUncles,
} from './types.js'
import * as rlp from 'rlp'
import { Block, BlockBuffer } from '@ethereumjs/block'
import { HistoryProtocol } from './history.js'

/**
 * Generates the Content ID used to calculate the distance between a node ID and the content Key
 * @param contentKey an object containing the `chainId` and `blockHash` used to generate the content Key
 * @param contentType a number identifying the type of content (block header, block body, receipt, epochAccumulator, headerAccumulator)
 * @param hash the hash of the content represented (i.e. block hash for header, body, or receipt, or root hash for accumulators)
 * @returns the hex encoded string representation of the SHA256 hash of the serialized contentKey
 */
export const getHistoryNetworkContentId = (
  chainId: number,
  contentType: HistoryNetworkContentTypes,
  hash?: string
) => {
  let encodedKey
  switch (contentType) {
    case HistoryNetworkContentTypes.BlockHeader:
    case HistoryNetworkContentTypes.BlockBody:
    case HistoryNetworkContentTypes.Receipt: {
      if (!hash) throw new Error('block hash is required to generate contentId')
      encodedKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: contentType,
        value: {
          chainId: chainId,
          blockHash: fromHexString(hash),
        },
      })
      break
    }
    case HistoryNetworkContentTypes.HeaderAccumulator: {
      encodedKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: contentType,
        value: { selector: 0, value: null },
      })
      break
    }
    case HistoryNetworkContentTypes.EpochAccumulator: {
      if (!hash) throw new Error('accumulator root hash is required to generate contentId')
      encodedKey = HistoryNetworkContentKeyUnionType.serialize({
        selector: contentType,
        value: {
          chainId: chainId,
          blockHash: fromHexString(hash),
        },
      })
      break
    }
    default:
      throw new Error('unsupported content type')
  }

  return toHexString(digest(encodedKey))
}

export const decodeSszBlockBody = (sszBody: Uint8Array) => {
  const body = BlockBodyContentType.deserialize(sszBody)
  const txsRlp = body.allTransactions.map((sszTx) => Buffer.from(sszTransaction.deserialize(sszTx)))
  const unclesRlp = sszUncles.deserialize(body.sszUncles)
  return [txsRlp, unclesRlp]
}

export const sszEncodeBlockBody = (block: Block) => {
  const encodedSSZTxs = block.transactions.map((tx) => sszTransaction.serialize(tx.serialize()))
  const encodedUncles = rlp.encode(block.uncleHeaders.map((uh) => uh.raw()))
  return BlockBodyContentType.serialize({
    allTransactions: encodedSSZTxs,
    sszUncles: sszUncles.serialize(encodedUncles),
  })
}

/**
 * Assembles RLP encoded block headers and bodies from the portal network into a `Block` object
 * @param rawHeader RLP encoded block header as Uint8Array
 * @param rawBody RLP encoded block body consisting of transactions and uncles as nested Uint8Arrays
 * @returns a `Block` object assembled from the header and body provided
 */
export const reassembleBlock = (rawHeader: Uint8Array, rawBody: Uint8Array) => {
  const decodedBody = decodeSszBlockBody(rawBody)
  const block = Block.fromValuesArray(
    //@ts-ignore
    [rlp.decode(Buffer.from(rawHeader)), decodedBody[0], rlp.decode(decodedBody[1])] as BlockBuffer,
    { hardforkByBlockNumber: true }
  )

  return block
}

/**
 * Takes an RLP encoded block as a hex string and adds the block header and block body to the `portal` content DB
 * @param rlpHex RLP encoded block as hex string
 * @param blockHash block hash as 0x prefixed hext string
 * @param portal a running `PortalNetwork` client
 */
export const addRLPSerializedBlock = async (
  rlpHex: string,
  blockHash: string,
  protocol: HistoryProtocol
) => {
  const decodedBlock = rlp.decode(fromHexString(rlpHex))
  await protocol.addContentToHistory(
    1,
    HistoryNetworkContentTypes.BlockHeader,
    blockHash,
    rlp.encode((decodedBlock as Buffer[])[0])
  )
  await protocol.addContentToHistory(
    1,
    HistoryNetworkContentTypes.BlockBody,
    blockHash,
    sszEncodeBlockBody(
      Block.fromRLPSerializedBlock(Buffer.from(fromHexString(rlpHex)), {
        hardforkByBlockNumber: true,
      })
    )
  )
}
