import { NodeId, toHex, fromHex } from '@chainsafe/discv5'
import { fromHexString } from '@chainsafe/ssz'
import { Block, BlockBuffer, BlockHeader } from '@ethereumjs/block'
import { toBigIntBE, toBufferBE } from 'bigint-buffer'
import rlp from 'rlp'
import { PortalNetwork } from '..'
import { HistoryNetworkContentTypes } from '../historySubnetwork/types'

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

export const reassembleBlock = (rawHeader: Uint8Array, rawBody: Uint8Array) => {
  const header = BlockHeader.fromRLPSerializedHeader(Buffer.from(rawHeader))
  const decodedBody = rlp.decode(rawBody)
  // Verify we can construct a valid block from the header and body provided
  return Block.fromValuesArray([header.raw(), ...decodedBody] as BlockBuffer)
}

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
    rlp.encode(decodedBlock[0])
  )
  await portal.addContentToHistory(
    1,
    HistoryNetworkContentTypes.BlockBody,
    blockHash,
    rlp.encode([decodedBlock[1], decodedBlock[2]])
  )
}
