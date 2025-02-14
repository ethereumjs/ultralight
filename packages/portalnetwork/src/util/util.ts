import { digest } from '@chainsafe/as-sha256'
import { ENR } from '@chainsafe/enr'
import {
  bigIntToBytes,
  bytesToBigInt,
  bytesToUnprefixedHex,
  unprefixedHexToBytes,
} from '@ethereumjs/util'

import type { NodeId } from '@chainsafe/enr'
import type { PortalNetworkRoutingTable, RoutingTable } from '../client'

export const MEGABYTE = 1048576

/**
 *  Shortens a Node ID to a readable length
 */
export const shortId = (nodeId: string | ENR, routingTable?: PortalNetworkRoutingTable) => {
  let enr
  if (typeof nodeId === 'string') {
    enr = routingTable?.getWithPending(nodeId)
    if (enr === undefined) return nodeId.slice(0, 5) + '...' + nodeId.slice(nodeId.length - 5)
    enr = enr.value
  } else {
    enr = nodeId
  }

  const nodeType = enr.kvs.get('c')
  const nodeTypeString =
    nodeType !== undefined && nodeType.length > 0 ? `${nodeType.toString().split(/[ :,]/)[0]}:` : ''
  return nodeTypeString + enr.nodeId.slice(0, 5) + '...' + enr.nodeId.slice(enr.nodeId.length - 5)
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
  return bytesToUnprefixedHex(
    bigIntToBytes(bytesToBigInt(unprefixedHexToBytes(nodeId), false) ^ xorNumericDistance),
  ).padStart(64, '0')
}

/**
 * Generates the Content ID used to calculate the distance between a node ID and the content key
 * @param contentKey a serialized content key
 * @returns the hex encoded string representation of the SHA256 hash of the serialized contentKey
 */
export const serializedContentKeyToContentId = (contentKey: Uint8Array) => {
  return bytesToUnprefixedHex(digest(contentKey))
}

export function arrayByteLength(byteArray: any[]): number {
  const length = byteArray.reduce((prev, curr) => prev + curr.length, 0)
  return length
}

/**
 * Utility method to get an ENR (either from text encoded ENR or from a routing table)
 * @param routingTable the network routing table an ENR could be in
 * @param enrOrId a base64 text encoded ENR (e.g. 'enr:...') or a NodeId (a 32 byte hex encoded string)
 * @returns a {@link ENR} or `undefined` if not found
 */
export const getENR = (routingTable: RoutingTable, enrOrId: string) => {
  const enr = enrOrId.startsWith('enr:')
    ? ENR.decodeTxt(enrOrId)
    : routingTable.getWithPending(enrOrId)?.value !== undefined
      ? routingTable.getWithPending(enrOrId)?.value
      : routingTable.getWithPending(enrOrId.slice(2))?.value
  return enr
}
