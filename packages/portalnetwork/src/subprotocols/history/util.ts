import { digest } from '@chainsafe/as-sha256'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { HistoryNetworkContentKeyUnionType } from './index.js'
import {
  BlockBodyContent,
  BlockBodyContentType,
  HistoryNetworkContentTypes,
  sszTransaction,
  sszUncles,
} from './types.js'
import rlp from '@ethereumjs/rlp'
import {
  Block,
  BlockBuffer,
  BlockHeaderBuffer,
  TransactionsBuffer,
  UncleHeadersBuffer,
} from '@ethereumjs/block'
import { HistoryProtocol } from './history.js'
import fs from 'fs-extra'
import { Common } from '@ethereumjs/common'

const genesisJson = await fs.readJSON(
  '/home/jim/development/ethjs/packages/client/test/sim/configs/geth-genesis.json'
)

const common = Common.fromGethGenesis(genesisJson, {
  genesisHash: Buffer.from('51c7fe41be669f69c45c33a56982cbde405313342d9e2b00d7c91a7b284dd4f8'),
  chain: 'geth-genesis',
})
common.setHardfork('merge')
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
    case HistoryNetworkContentTypes.Receipt:
    case HistoryNetworkContentTypes.HeaderProof: {
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

export const decodeSszBlockBody = (sszBody: Uint8Array): BlockBodyContent => {
  const body = BlockBodyContentType.deserialize(sszBody)
  const txsRlp = body.allTransactions.map((sszTx) => Buffer.from(sszTransaction.deserialize(sszTx)))
  const unclesRlp = sszUncles.deserialize(body.sszUncles)
  return { txsRlp, unclesRlp }
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
export const reassembleBlock = (rawHeader: Uint8Array, rawBody?: Uint8Array) => {
  if (rawBody) {
    const decodedBody = decodeSszBlockBody(rawBody)
    const block = Block.fromValuesArray(
      [
        rlp.decode(Buffer.from(rawHeader)) as never as BlockHeaderBuffer,
        decodedBody.txsRlp as TransactionsBuffer,
        rlp.decode(decodedBody.unclesRlp) as never as UncleHeadersBuffer,
      ] as BlockBuffer,
      { common, hardforkByBlockNumber: true }
    )
    return block
  } else {
    const blockBuffer: BlockBuffer = [
      rlp.decode(Buffer.from(rawHeader)) as never as BlockHeaderBuffer,
      rlp.decode(Buffer.from(Uint8Array.from([]))) as never as TransactionsBuffer,
      rlp.decode(Buffer.from(Uint8Array.from([]))) as never as UncleHeadersBuffer,
    ] as BlockBuffer
    const block = Block.fromValuesArray(blockBuffer, { common, hardforkByBlockNumber: true })
    return block
  }
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
  const genesisJson = await fs.readJSON(
    '/home/jim/development/ethjs/packages/client/test/sim/configs/geth-genesis.json'
  )

  const common = Common.fromGethGenesis(genesisJson, {
    genesisHash: Buffer.from('51c7fe41be669f69c45c33a56982cbde405313342d9e2b00d7c91a7b284dd4f8'),
    chain: 'geth-genesis',
  })
  common.setHardfork('merge')
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
        common,
      })
    )
  )
}

// Each EpochAccumulator is a merkle tree with 16384 leaves, and 16383 parent nodes.
// gIndex refers to index within the tree starting at the root
// So the gIndices of the leaf nodes start at 16384

export const blockNumberToGindex = (blockNumber: bigint): bigint => {
  const listIndex = blockNumber % BigInt(8192)
  const gIndex = listIndex + BigInt(16384)
  return gIndex
}
