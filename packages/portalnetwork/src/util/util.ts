import { digest } from '@chainsafe/as-sha256'
import { ENR, NodeId, fromHex, toHex } from '@chainsafe/discv5'
import { toHexString } from '@chainsafe/ssz'
import { bytesToUtf8 } from '@ethereumjs/util'
import { toBigIntBE, toBufferBE } from 'bigint-buffer'
import { promises as fs } from 'fs'

import * as path from 'path'

export const MEGABYTE = 1048576

/**
 *  Shortens a Node ID to a readable length
 */
export const shortId = (nodeId: string | ENR) => {
  if (typeof nodeId === 'string')
    return nodeId.slice(0, 5) + '...' + nodeId.slice(nodeId.length - 5)
  const nodeType = nodeId.kvs.get('c')
  const nodeTypeString =
    nodeType !== undefined && nodeType.length > 0 ? `${bytesToUtf8(nodeType)}:` : ''
  return (
    nodeTypeString +
    nodeId.nodeId.slice(0, 5) +
    '...' +
    nodeId.nodeId.slice(nodeId.nodeId.length - 5)
  )
}

/**
 * Generates a random node ID at the specified target log2 distance (i.e. generates a random node ID in a given k-bucket)
 * Follows this algorithm - https://github.com/ethereum/trin/pull/213
 * @param nodeId id of the node to calculate distance from
 * @param targetDistance the target log2 distance to generate a nodeId at
 * @returns a random node ID at a log2 distance of `targetDistance`
 */
export const generateRandomNodeIdAtDistance = (nodeId: NodeId, targetDistance: number): NodeId => {
  const binaryDistance = new Array(256 - targetDistance).fill(0)
  binaryDistance.push(1)
  while (binaryDistance.length < 256) {
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
  return toHexString(digest(contentKey))
}

export const dirSize = async (directory: string) => {
  const files = await fs?.readdir(directory)
  const stats = files.map((file) => fs?.stat(path.join(directory, file)))
  const bytesSize = (await Promise.all(stats)).reduce(
    (accumulator, { size }) => accumulator + size,
    0,
  )
  return bytesSize / MEGABYTE
}

export function arrayByteLength(byteArray: any[]): number {
  const length = byteArray.reduce((prev, curr) => prev + curr.length, 0)
  return length
}
