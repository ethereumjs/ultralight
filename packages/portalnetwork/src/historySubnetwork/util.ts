import SHA256 from '@chainsafe/as-sha256'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { HistoryNetworkContentKeyUnionType } from '.'
import { HistoryNetworkContentTypes } from './types'

/**
 * Generates the Content ID used to calculate the distance between a node ID and the content Key
 * @param contentKey an object containing the `chainId` and `blockHash` used to generate the content Key
 * @param contentType a number identifying the type of content (block header, block body, receipt)
 * @returns the hex encoded string representation of the SHA256 hash of the serialized contentKey
 */
export const getContentId = (
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
 * Generates the Content ID used to calculate the distance between a node ID and the content key
 * @param contentKey a serialized content key
 * @returns the hex encoded string representation of the SHA256 hash of the serialized contentKey
 */
export const getContentIdFromSerializedKey = (contentKey: Uint8Array) => {
  return toHexString(SHA256.digest(contentKey))
}
