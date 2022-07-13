import { digest } from '@chainsafe/as-sha256'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { HistoryNetworkContentKeyUnionType } from './index.js'
import { HistoryNetworkContentTypes } from './types.js'
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

/**
 * Assembles RLP encoded block headers and bodies from the portal network into a `Block` object
 * @param rawHeader RLP encoded block header as Uint8Array
 * @param rawBody RLP encoded block body consisting of transactions and uncles as nested Uint8Arrays
 * @returns a `Block` object assembled from the header and body provided
 */
export const reassembleBlock = (rawHeader: Uint8Array, rawBody: Uint8Array) => {
  const decodedBody = rlp.decode(rawBody)
  const block = Block.fromValuesArray(
    //@ts-ignore
    [
      rlp.decode(Buffer.from(rawHeader)),
      (decodedBody as Buffer[])[0],
      (decodedBody as Buffer[])[1],
    ] as BlockBuffer
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
    rlp.encode([(decodedBlock as any)[1], (decodedBlock as any)[2]])
  )
}
