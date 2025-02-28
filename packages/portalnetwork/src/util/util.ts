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

/**
 * Bidirectional map that maintains a one-to-one correspondence between keys and values.
 * When a key-value pair is added, any existing pairs with the same key or value are removed.
 * @template T The type of the keys
 * @template U The type of the values
 * @note Build by robots with oversight by acolytec3
 */
export class BiMap<T, U> {
  #forward = new Map<T, U>()
  #reverse = new Map<U, T>()

  /**
   * Sets a key-value pair in the map. If either the key or value already exists,
   * the old mapping is removed before the new one is added.
   * @param key The key to set
   * @param value The value to set
   */
  set(key: T, value: U): void {
    const oldValue = this.#forward.get(key)
    if (oldValue !== undefined) {
      this.#reverse.delete(oldValue)
    }

    const oldKey = this.#reverse.get(value)
    if (oldKey !== undefined) {
      this.#forward.delete(oldKey)
    }

    this.#forward.set(key, value)
    this.#reverse.set(value, key)
  }

  /**
   * Gets a value by its key
   * @param key The key to look up
   * @returns The associated value, or undefined if the key doesn't exist
   */
  getByKey(key: T): U | undefined {
    return this.#forward.get(key)
  }

  /**
   * Gets a key by its value
   * @param value The value to look up
   * @returns The associated key, or undefined if the value doesn't exist
   */
  getByValue(value: U): T | undefined {
    return this.#reverse.get(value)
  }

  /**
   * Removes a key-value pair from the map
   * @param key The key to remove
   * @returns true if a pair was removed, false if the key didn't exist
   */
  delete(key: T): boolean {
    const value = this.#forward.get(key)
    if (value === undefined) return false

    this.#forward.delete(key)
    this.#reverse.delete(value)
    return true
  }

  /**
   * Gets the size of the map
   * @returns the size of the map
   */
  get size(): number {
    return this.#forward.size
  }
}
