import { RLP } from '@ethereumjs/rlp'
import { Trie } from '@ethereumjs/trie'
import { KECCAK256_RLP } from '@ethereumjs/util'
import { Bloom, encodeReceipt } from '@ethereumjs/vm'

import type { Block } from '@ethereumjs/block'
import type { RunBlockOpts, VM } from '@ethereumjs/vm'

/**
 * Applies the transactions in a block, computing the receipts
 * as well as gas usage and some relevant data. This method is
 * side-effect free (it doesn't modify the block nor the state).
 * @param {Block} block
 * @param {RunBlockOpts} opts
 */
export async function applyTransactions(this: VM, block: Block, opts: RunBlockOpts) {
  const bloom = new Bloom()
  // the total amount of gas used processing these transactions
  let gasUsed = 0n

  let receiptTrie: Trie | undefined = undefined
  if (block.transactions.length !== 0) {
    receiptTrie = new Trie()
  }

  const receipts = []
  const txResults = []

  /*
   * Process transactions
   */
  for (let txIdx = 0; txIdx < block.transactions.length; txIdx++) {
    const tx = block.transactions[txIdx]

    let maxGasLimit
    if (this.common.isActivatedEIP(1559) === true) {
      maxGasLimit = block.header.gasLimit * this.common.param('gasConfig', 'elasticityMultiplier')
    } else {
      maxGasLimit = block.header.gasLimit
    }
    const gasLimitIsHigherThanBlock = maxGasLimit < tx.gasLimit + gasUsed
    if (gasLimitIsHigherThanBlock) {
      const msg = 'tx has a higher gas limit than the block'
      throw new Error(msg)
    }

    // Run the tx through the VM
    const { skipBalance, skipNonce, skipHardForkValidation } = opts

    const txRes = await this.runTx({
      tx,
      block,
      skipBalance,
      skipNonce,
      skipHardForkValidation,
      blockGasUsed: gasUsed,
    })
    txResults.push(txRes)

    // Add to total block gas usage
    gasUsed += txRes.totalGasSpent

    // Combine blooms via bitwise OR
    bloom.or(txRes.bloom)

    // Add receipt to trie to later calculate receipt root
    receipts.push(txRes.receipt)
    const encodedReceipt = encodeReceipt(txRes.receipt, tx.type)
    await receiptTrie!.put(RLP.encode(txIdx), encodedReceipt)
  }

  const receiptsRoot = receiptTrie !== undefined ? receiptTrie.root() : KECCAK256_RLP

  return {
    bloom,
    gasUsed,
    receiptsRoot,
    receipts,
    results: txResults,
  }
}
