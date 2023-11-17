import { digest } from '@chainsafe/as-sha256'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block, BlockHeader } from '@ethereumjs/block'
import { RLP as rlp } from '@ethereumjs/rlp'
import { hexToBytes } from '@ethereumjs/util'

import { historicalEpochs } from './data/epochHashes.js'
import {
  BlockBodyContentType,
  BlockHeaderWithProof,
  EpochAccumulator,
  HistoryNetworkContentType,
  MERGE_BLOCK,
  PostShanghaiBlockBody,
  PreShanghaiBlockBody,
  SSZWithdrawal,
  sszTransactionType,
  sszUnclesType,
} from './types.js'

import type { HistoryNetwork } from './history.js'
import type { BlockBodyContent, Witnesses } from './types.js'
import type {
  BlockBytes,
  BlockHeaderBytes,
  TransactionsBytes,
  UncleHeadersBytes,
  WithdrawalsBytes,
} from '@ethereumjs/block'
import type { WithdrawalBytes } from '@ethereumjs/util'

/**
 * Generates the Content ID used to calculate the distance between a node ID and the content Key
 * @param contentKey an object containing the and `blockHash` used to generate the content Key
 * @param contentType a number identifying the type of content (block header, block body, receipt, epochAccumulator)
 * @param hash the hash of the content represented (i.e. block hash for header, body, or receipt, or root hash for accumulators)
 * @returns the hex encoded string representation of the SHA256 hash of the serialized contentKey
 */
export const getContentKey = (contentType: HistoryNetworkContentType, hash: Uint8Array): string => {
  let encodedKey
  const prefix = new Uint8Array(1).fill(contentType)
  switch (contentType) {
    case HistoryNetworkContentType.BlockHeader:
    case HistoryNetworkContentType.BlockBody:
    case HistoryNetworkContentType.Receipt:
    case HistoryNetworkContentType.HeaderProof:
    case HistoryNetworkContentType.EpochAccumulator: {
      if (hash === undefined) throw new Error('block hash is required to generate contentId')
      encodedKey = toHexString(prefix) + toHexString(hash).slice(2)
      break
    }
    default:
      throw new Error('unsupported content type')
  }
  return encodedKey
}
export const getContentId = (contentType: HistoryNetworkContentType, hash: string) => {
  const encodedKey = hexToBytes(getContentKey(contentType, hexToBytes(hash)))

  return toHexString(digest(encodedKey))
}
export const decodeHistoryNetworkContentKey = (contentKey: string) => {
  const contentType = parseInt(contentKey.slice(0, 4))
  const blockHash = '0x' + contentKey.slice(4)
  return {
    contentType,
    blockHash,
  }
}

export const decodeSszBlockBody = (
  sszBody: Uint8Array,
  withdrawals: boolean = false,
): BlockBodyContent => {
  if (withdrawals) {
    const body = PostShanghaiBlockBody.deserialize(sszBody)
    const txsRlp = body.allTransactions.map((sszTx) => sszTransactionType.deserialize(sszTx))
    const unclesRlp = sszUnclesType.deserialize(body.sszUncles)
    const allWithdrawals = body.allWithdrawals.map((sszW) => SSZWithdrawal.deserialize(sszW))
    return {
      txsRlp,
      unclesRlp,
      allWithdrawals,
    }
  } else {
    try {
      const body = BlockBodyContentType.deserialize(sszBody)
      const txsRlp = body.allTransactions.map((sszTx) => sszTransactionType.deserialize(sszTx))
      const unclesRlp = sszUnclesType.deserialize(body.sszUncles)
      return { txsRlp, unclesRlp }
    } catch {
      const body = PostShanghaiBlockBody.deserialize(sszBody)
      const txsRlp = body.allTransactions.map((sszTx) => sszTransactionType.deserialize(sszTx))
      const unclesRlp = sszUnclesType.deserialize(body.sszUncles)
      const allWithdrawals = body.allWithdrawals.map((sszW) => SSZWithdrawal.deserialize(sszW))
      return {
        txsRlp,
        unclesRlp,
        allWithdrawals,
      }
    }
  }
}

export const sszEncodeBlockBody = (block: Block) => {
  const encodedSSZTxs = block.transactions.map((tx) => sszTransactionType.serialize(tx.serialize()))
  const encodedUncles = rlp.encode(block.uncleHeaders.map((uh) => uh.raw()))
  if (block.withdrawals) {
    const encodedWithdrawals = block.withdrawals.map((w) => rlp.encode(w.raw()))
    const sszWithdrawals = encodedWithdrawals.map((w) => SSZWithdrawal.serialize(w))
    return PostShanghaiBlockBody.serialize({
      allTransactions: encodedSSZTxs,
      sszUncles: encodedUncles,
      allWithdrawals: sszWithdrawals,
    })
  } else {
    return PreShanghaiBlockBody.serialize({
      allTransactions: encodedSSZTxs,
      sszUncles: encodedUncles,
    })
  }
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
    const valuesArray: BlockBytes = [
      rlp.decode(rawHeader) as never as BlockHeaderBytes,
      decodedBody.txsRlp as TransactionsBytes,
      rlp.decode(decodedBody.unclesRlp) as never as UncleHeadersBytes,
    ]
    if ('allWithdrawals' in decodedBody) {
      valuesArray.push(decodedBody.allWithdrawals.map((w) => rlp.decode(w)) as WithdrawalBytes)
    }
    const block = Block.fromValuesArray(valuesArray, { setHardfork: true })
    return block
  } else {
    const header = BlockHeader.fromRLPSerializedHeader(rawHeader)
    let blockBuffer
    if (header.number < MERGE_BLOCK) {
      blockBuffer = [
        rlp.decode(rawHeader) as never as BlockHeaderBytes,
        rlp.decode(Uint8Array.from([])) as never as TransactionsBytes,
        rlp.decode(Uint8Array.from([])) as never as UncleHeadersBytes,
      ] as BlockBytes
    } else {
      blockBuffer = [
        rlp.decode(rawHeader) as never as BlockHeaderBytes,
        rlp.decode(Uint8Array.from([])) as never as TransactionsBytes,
        rlp.decode(Uint8Array.from([])) as never as UncleHeadersBytes,
        new Array(4).fill(new Uint8Array()) as WithdrawalsBytes,
      ] as BlockBytes
    }
    const block = Block.fromValuesArray(blockBuffer, { setHardfork: true })
    return block
  }
}

/**
 * Takes an RLP encoded block as a hex string and adds the block header and block body to the `portal` content DB
 * @param rlpHex RLP encoded block as hex string
 * @param blockHash block hash as 0x prefixed hex string
 * @param portal a running `PortalNetwork` client
 */
export const addRLPSerializedBlock = async (
  rlpHex: string,
  blockHash: string,
  network: HistoryNetwork,
  witnesses?: Witnesses,
) => {
  const block = Block.fromRLPSerializedBlock(fromHexString(rlpHex), {
    setHardfork: true,
  })
  const header = block.header
  if (header.number < MERGE_BLOCK) {
    // Only generate proofs for pre-merge headers
    const proof: Witnesses = witnesses ?? (await network.generateInclusionProof(header.number))
    const headerProof = BlockHeaderWithProof.serialize({
      header: header.serialize(),
      proof: { selector: 1, value: proof },
    })
    try {
      await network.validateHeader(headerProof, blockHash)
    } catch {
      throw new Error('Header proof failed validation')
    }
    await network.store(
      HistoryNetworkContentType.BlockHeader,
      toHexString(header.hash()),
      headerProof,
    )
  } else {
    const headerProof = BlockHeaderWithProof.serialize({
      header: header.serialize(),
      proof: { selector: 0, value: null },
    })
    await network.indexBlockhash(header.number, toHexString(header.hash()))

    await network.store(
      HistoryNetworkContentType.BlockHeader,
      toHexString(header.hash()),
      headerProof,
    )
  }
  const sszBlock = sszEncodeBlockBody(
    Block.fromRLPSerializedBlock(fromHexString(rlpHex), {
      setHardfork: true,
    }),
  )
  await network.addBlockBody(sszBlock, toHexString(header.hash()), header.serialize())
}

// Each EpochAccumulator is a merkle tree with 16384 leaves, and 16383 parent nodes.
// gIndex refers to index within the tree starting at the root
// So the gIndices of the leaf nodes start at 16384

export const blockNumberToGindex = (blockNumber: bigint): bigint => {
  const randArray = new Array(8192).fill({
    blockHash: hexToBytes('0xa66afd523336ddf6e71567e366c7ef98aa529644915c30a3802eac73c2c2f3a6'),
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
  return historicalEpochs[index] ? hexToBytes(historicalEpochs[index]) : undefined
}
export const epochRootByBlocknumber = (blockNumber: bigint) => {
  return epochRootByIndex(epochIndexByBlocknumber(blockNumber))
}
