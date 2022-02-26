import SHA256 from '@chainsafe/as-sha256'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { HistoryNetworkContentKeyUnionType } from '.'
import { PortalNetwork } from '..'
import { HistoryNetworkContentTypes } from './types'
import * as rlp from 'rlp'
import { Block, BlockBuffer } from '@ethereumjs/block'
/**
 * Generates the Content ID used to calculate the distance between a node ID and the content Key
 * @param contentKey an object containing the `chainId` and `blockHash` used to generate the content Key
 * @param contentType a number identifying the type of content (block header, block body, receipt)
 * @returns the hex encoded string representation of the SHA256 hash of the serialized contentKey
 */
export const getHistoryNetworkContentId = (
  chainId: number,
  blockHash: string,
  contentType: HistoryNetworkContentTypes
) => {
  const encodedKey = HistoryNetworkContentKeyUnionType.serialize({
    selector: contentType,
    value: {
      chainId: chainId,
      blockHash: fromHexString(blockHash),
    },
  })
  return toHexString(SHA256.digest(encodedKey))
}

/**
 * Assembles RLP encoded block headers and bodies from the portal network into a `Block` object
 * @param rawHeader RLP encoded block header as Uint8Array
 * @param rawBody RLP encoded block body consisting of transactions and uncles as nested Uint8Arrays
 * @returns a `Block` object assembled from the header and body provided
 */
export const reassembleBlock = (rawHeader: Uint8Array, rawBody: Uint8Array) => {
  const decodedBody = rlp.decode(rawBody)
  //@ts-ignore
  return Block.fromValuesArray(
    //@ts-ignore
    [
      rlp.decode(Buffer.from(rawHeader)),
      (decodedBody as Buffer[])[0],
      (decodedBody as Buffer[])[1],
    ] as BlockBuffer
  )
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
  portal: PortalNetwork
) => {
  const decodedBlock = rlp.decode(fromHexString(rlpHex))
  await portal.addContentToHistory(
    1,
    HistoryNetworkContentTypes.BlockHeader,
    blockHash,
    rlp.encode((decodedBlock as Buffer[])[0])
  )
  await portal.addContentToHistory(
    1,
    HistoryNetworkContentTypes.BlockBody,
    blockHash,
    rlp.encode([(decodedBlock as any)[1], (decodedBlock as any)[2]])
  )
}
