import { digest } from '@chainsafe/as-sha256'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import {
  BlockBodyContent,
  BlockBodyContentType,
  BlockHeaderWithProof,
  EpochAccumulator,
  ContentType,
  sszTransactionType,
  sszUnclesType,
  Witnesses,
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
import { historicalEpochs } from './data/epochHashes.js'

/**
 * Generates the Content ID used to calculate the distance between a node ID and the content Key
 * @param contentKey an object containing the and `blockHash` used to generate the content Key
 * @param contentType a number identifying the type of content (block header, block body, receipt, epochAccumulator)
 * @param hash the hash of the content represented (i.e. block hash for header, body, or receipt, or root hash for accumulators)
 * @returns the hex encoded string representation of the SHA256 hash of the serialized contentKey
 */
export const getContentKey = (contentType: ContentType, hash: Uint8Array): string => {
  let encodedKey
  const prefix = Buffer.alloc(1, contentType)
  switch (contentType) {
    case ContentType.BlockHeader:
    case ContentType.BlockBody:
    case ContentType.Receipt:
    case ContentType.HeaderProof:
    case ContentType.EpochAccumulator: {
      if (!hash) throw new Error('block hash is required to generate contentId')
      encodedKey = toHexString(prefix) + toHexString(hash).slice(2)
      break
    }
    default:
      throw new Error('unsupported content type')
  }
  return encodedKey
}
export const getContentId = (contentType: ContentType, hash: string) => {
  const encodedKey = fromHexString(getContentKey(contentType, Buffer.from(fromHexString(hash))))

  return toHexString(digest(encodedKey))
}
export const decodeContentKey = (contentKey: string) => {
  const contentType = parseInt(contentKey.slice(0, 4))
  const blockHash = '0x' + contentKey.slice(4)
  return {
    contentType,
    blockHash,
  }
}

export const decodeSszBlockBody = (sszBody: Uint8Array): BlockBodyContent => {
  const body = BlockBodyContentType.deserialize(sszBody)
  const txsRlp = body.allTransactions.map((sszTx) =>
    Buffer.from(sszTransactionType.deserialize(sszTx))
  )
  const unclesRlp = sszUnclesType.deserialize(body.sszUncles)
  return { txsRlp, unclesRlp }
}

export const sszEncodeBlockBody = (block: Block) => {
  const encodedSSZTxs = block.transactions.map((tx) => sszTransactionType.serialize(tx.serialize()))
  const encodedUncles = rlp.encode(block.uncleHeaders.map((uh) => uh.raw()))
  return BlockBodyContentType.serialize({
    allTransactions: encodedSSZTxs,
    sszUncles: sszUnclesType.serialize(encodedUncles),
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
      { hardforkByBlockNumber: true }
    )
    return block
  } else {
    const blockBuffer: BlockBuffer = [
      rlp.decode(Buffer.from(rawHeader)) as never as BlockHeaderBuffer,
      rlp.decode(Buffer.from(Uint8Array.from([]))) as never as TransactionsBuffer,
      rlp.decode(Buffer.from(Uint8Array.from([]))) as never as UncleHeadersBuffer,
    ] as BlockBuffer
    const block = Block.fromValuesArray(blockBuffer, { hardforkByBlockNumber: true })
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
  protocol: HistoryProtocol,
  witnesses?: Witnesses
) => {
  const block = Block.fromRLPSerializedBlock(Buffer.from(fromHexString(rlpHex)), {
    hardforkByBlockNumber: true,
  })
  const header = block.header
  if (header.number < 15537393n) {
    // Only generate proofs for pre-merge headers
    const proof: Witnesses = witnesses ?? (await protocol.generateInclusionProof(header.number))
    const headerProof = BlockHeaderWithProof.serialize({
      header: header.serialize(),
      proof: { selector: 1, value: proof },
    })
    try {
      await protocol.validateHeader(headerProof, blockHash)
    } catch {
      throw new Error('Header proof failed validation')
    }
    await protocol.store(ContentType.BlockHeader, toHexString(header.hash()), headerProof)
  } else {
    const headerProof = BlockHeaderWithProof.serialize({
      header: header.serialize(),
      proof: { selector: 0, value: null },
    })
    await protocol.store(ContentType.BlockHeader, toHexString(header.hash()), headerProof)
  }
  await protocol.store(
    ContentType.BlockBody,
    toHexString(header.hash()),
    sszEncodeBlockBody(
      Block.fromRLPSerializedBlock(Buffer.from(fromHexString(rlpHex)), {
        hardforkByBlockNumber: true,
      })
    )
  )
}

// Each EpochAccumulator is a merkle tree with 16384 leaves, and 16383 parent nodes.
// gIndex refers to index within the tree starting at the root
// So the gIndices of the leaf nodes start at 16384

export const blockNumberToGindex = (blockNumber: bigint): bigint => {
  const randArray = new Array(8192).fill({
    blockHash: fromHexString('0xa66afd523336ddf6e71567e366c7ef98aa529644915c30a3802eac73c2c2f3a6'),
    totalDifficulty: 1n,
  })
  const epochAcc = EpochAccumulator.value_toTree(randArray)
  const listIndex = (Number(blockNumber) % 8192) * 2
  const gIndex = EpochAccumulator.tree_getLeafGindices(1n, epochAcc)[listIndex]
  return gIndex
}

export const epochIndexByBlocknumber = (blockNumber: bigint) => {
  return Math.floor(Number(blockNumber) / 8192)
}
export const blockNumberToLeafIndex = (blockNumber: bigint) => {
  return (Number(blockNumber) % 8192) * 2
}
export const epochRootByIndex = (index: number) => {
  return fromHexString(historicalEpochs[index])
}
export const epochRootByBlocknumber = (blockNumber: bigint) => {
  return epochRootByIndex(epochIndexByBlocknumber(blockNumber))
}
