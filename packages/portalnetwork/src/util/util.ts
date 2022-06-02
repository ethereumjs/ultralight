import SHA256 from '@chainsafe/as-sha256'
import { NodeId, toHex, fromHex } from '@chainsafe/discv5'
import { toHexString } from '@chainsafe/ssz'
import { toBigIntBE, toBufferBE } from 'bigint-buffer'
import { readdir, stat } from 'fs/promises'
import * as path from 'path'

export const MEGABYTE = 1048576

/**
 *  Shortens a Node ID to a readable length
 */
export const shortId = (nodeId: string) => {
  return nodeId.slice(0, 5) + '...' + nodeId.slice(nodeId.length - 5)
}

/**
 * Generates a random node ID at the specified target log2 distance (i.e. generates a random node ID in a given k-bucket)
 * Follows this algorithm - https://github.com/ethereum/trin/pull/213
 * @param nodeId id of the node to calculate distance from
 * @param targetDistance the target log2 distance to generate a nodeId at
 * @returns a random node ID at a log2 distance of `targetDistance`
 */
export const generateRandomNodeIdAtDistance = (nodeId: NodeId, targetDistance: number): NodeId => {
  const binaryDistance = new Array(255 - targetDistance).fill(0)
  binaryDistance.push(1)
  while (binaryDistance.length < 255) {
    binaryDistance.push(Math.random() >= 0.5 ? 1 : 0)
  }
  const xorNumericDistance = BigInt(parseInt(binaryDistance.join(''), 2))
  return toHex(toBufferBE(toBigIntBE(fromHex(nodeId)) ^ xorNumericDistance, 32))
}

/**
 * Generates the Content ID used to calculate the distance between a node ID and the content key
 * @param contentKey a serialized content key
 * @returns the hex encoded string representation of the SHA256 hash of the serialized contentKey
 */
export const serializedContentKeyToContentId = (contentKey: Uint8Array) => {
  return toHexString(SHA256.digest(contentKey))
}

export const dirSize = async (directory: string) => {
  const files = await readdir(directory)
  const stats = files.map((file) => stat(path.join(directory, file)))
  const bytesSize = (await Promise.all(stats)).reduce(
    (accumulator, { size }) => accumulator + size,
    0
  )
  return bytesSize / MEGABYTE
}
