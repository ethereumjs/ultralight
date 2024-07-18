import { digest } from '@chainsafe/as-sha256'
import { ProofType, createProof } from '@chainsafe/persistent-merkle-tree'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block, BlockHeader } from '@ethereumjs/block'
import { RLP as rlp } from '@ethereumjs/rlp'
import { equalsBytes, hexToBytes } from '@ethereumjs/util'
import { ssz } from '@lodestar/types'

import { historicalEpochs } from './data/epochHashes.js'
import { historicalRoots } from './data/historicalRoots.js'
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
import type { Proof, SingleProof, SingleProofInput } from '@chainsafe/persistent-merkle-tree'
import type {
  ByteVectorType,
  UintBigintType,
  ValueOfFields,
  VectorCompositeType,
} from '@chainsafe/ssz'
import type {
  BlockBytes,
  BlockHeaderBytes,
  TransactionsBytes,
  UncleHeadersBytes,
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
    const header = BlockHeader.fromRLPSerializedHeader(rawHeader, {
      setHardfork: true,
      skipConsensusFormatValidation: false,
    })
    const block = Block.fromBlockData({ header }, { setHardfork: true })
    return block
  }
}

/**
 * Takes an RLP encoded block as a hex string and adds the block header and block body to the `portal` content DB
 * @param rlpHex RLP encoded block as hex string
 * @param blockHash block hash as 0x prefixed hex string
 * @param network a running `PortalNetwork` client
 */
export const addRLPSerializedBlock = async (
  rlpHex: string,
  blockHash: string,
  network: HistoryNetwork,
  witnesses: Witnesses,
) => {
  const block = Block.fromRLPSerializedBlock(fromHexString(rlpHex), {
    setHardfork: true,
  })
  const header = block.header
  const headerKey = getContentKey(HistoryNetworkContentType.BlockHeader, hexToBytes(blockHash))
  if (header.number < MERGE_BLOCK) {
    const proof: Witnesses = witnesses
    const headerProof = BlockHeaderWithProof.serialize({
      header: header.serialize(),
      proof: { selector: 1, value: proof },
    })
    try {
      await network.validateHeader(headerProof, blockHash)
    } catch {
      network.logger('Header proof failed validation while loading block from RLP')
    }
    await network.store(headerKey, headerProof)
  } else {
    const headerProof = BlockHeaderWithProof.serialize({
      header: header.serialize(),
      proof: { selector: 0, value: null },
    })
    await network.indexBlockhash(header.number, toHexString(header.hash()))

    await network.store(headerKey, headerProof)
  }
  const sszBlock = sszEncodeBlockBody(block)
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

// Returns the index of a slot in a Historical Batch (i.e. an epoch of 8192 beacon block roots/state roots)
export const slotToHistoricalBatchIndex = (slot: bigint) => {
  return slot - (slot / 8192n) * 8192n
}

// Returns the historical batch / era number a slot occurs in
// Note - this returns the zero indexed batch number (since historical_roots is a zero indexed array)
export const slotToHistoricalBatch = (slot: bigint) => {
  return slot / 8192n
}

export const verifyPreMergeHeaderProof = (
  witnesses: Uint8Array[],
  blockHash: string,
  blockNumber: bigint,
): boolean => {
  try {
    const target = epochRootByIndex(epochIndexByBlocknumber(blockNumber))
    const proof: Proof = {
      type: ProofType.single,
      gindex: blockNumberToGindex(blockNumber),
      witnesses,
      leaf: hexToBytes(blockHash),
    }
    EpochAccumulator.createFromProof(proof, target)
    return true
  } catch (_err) {
    return false
  }
}

export const verifyPreCapellaHeaderProof = (
  proof: ValueOfFields<{
    beaconBlockHeaderProof: VectorCompositeType<ByteVectorType>
    beaconBlockHeaderRoot: ByteVectorType
    historicalRootsProof: VectorCompositeType<ByteVectorType>
    slot: UintBigintType
  }>,
  elBlockHash: Uint8Array,
) => {
  const batchIndex = slotToHistoricalBatchIndex(proof.slot)
  const historicalRootsPath = ssz.phase0.HistoricalBatch.getPathInfo([
    'blockRoots',
    Number(batchIndex),
  ])
  const reconstructedBatch = ssz.phase0.HistoricalBatch.createFromProof({
    witnesses: proof.historicalRootsProof,
    type: ProofType.single,
    gindex: historicalRootsPath.gindex,
    leaf: proof.beaconBlockHeaderRoot, // This should be the leaf value this proof is verifying
  })
  if (
    !equalsBytes(
      reconstructedBatch.hashTreeRoot(),
      hexToBytes(historicalRoots[Number(slotToHistoricalBatch(proof.slot))]),
    )
  )
    return false

  const elBlockHashPath = ssz.bellatrix.BeaconBlock.getPathInfo([
    'body',
    'executionPayload',
    'blockHash',
  ])
  const reconstructedBlock = ssz.bellatrix.BeaconBlock.createFromProof({
    witnesses: proof.beaconBlockHeaderProof,
    type: ProofType.single,
    gindex: elBlockHashPath.gindex,
    leaf: elBlockHash,
  })

  if (!equalsBytes(reconstructedBlock.hashTreeRoot(), proof.beaconBlockHeaderRoot)) return false
  return true
}

export const generatePreMergeHeaderProof = async (
  blockNumber: bigint,
  epochAccumulator: Uint8Array,
): Promise<Witnesses> => {
  if (blockNumber > MERGE_BLOCK)
    throw new Error('cannot generate preMerge header for post merge block')
  try {
    const accumulator = EpochAccumulator.deserialize(epochAccumulator)
    const tree = EpochAccumulator.value_toTree(accumulator)
    const proofInput: SingleProofInput = {
      type: ProofType.single,
      gindex: blockNumberToGindex(blockNumber),
    }
    const proof = createProof(tree, proofInput) as SingleProof
    return proof.witnesses
  } catch (err: any) {
    throw new Error('Error generating inclusion proof: ' + (err as any).message)
  }
}
