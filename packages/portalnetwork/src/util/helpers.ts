import { ethers } from 'ethers'
import { BlockWithTransactions } from '@ethersproject/abstract-provider'
import { Block as ethJsBlock } from '@ethereumjs/block'
import { toHexString } from './index.js'
import debug from 'debug'

/**
 *
 * @param block An {@ethereumjs/block Block} object
 * @returns returns an ethers.providers.Block representation of the data
 */
export const ethJsBlockToEthersBlock = (block: ethJsBlock): ethers.providers.Block => {
  debug.enable('ethJsBlockToEthersBlock')
  debug('ethJsBlockToEthersBlock')('found a block')

  return {
    hash: toHexString(block.hash()),
    transactions: [],
    parentHash: toHexString(block.header.parentHash),
    number: Number(block.header.number),
    timestamp: Number(block.header.timestamp),
    nonce: toHexString(block.header.nonce),
    difficulty: Number(block.header.difficulty),
    gasLimit: ethers.BigNumber.from(block.header.gasLimit),
    miner: block.header.coinbase.toString(),
    gasUsed: ethers.BigNumber.from(block.header.gasUsed),
    extraData: toHexString(block.header.extraData),
    _difficulty: ethers.BigNumber.from(block.header.difficulty),
  }
}

/**
 *
 * @param block An {@ethereumjs/block Block} object
 * @returns returns an ethers.providers.Block representation of the data
 */
export const ethJsBlockToEthersBlockWithTxs = (block: ethJsBlock): BlockWithTransactions => {
  debug.enable('ethJsBlockToEthersBlock')
  debug('ethJsBlockToEthersBlock')('found a block')

  const txns = []
  for (const tx of block.transactions) {
    const normedTx = {
      hash: toHexString(tx.hash()),
      r: tx.r?.toString(),
      s: tx.s?.toString(),
      v: Number(tx.v),
      confirmations: 0,
      from: tx.getSenderAddress().toString(),
      wait: () => Promise<any>,
      nonce: Number(tx.nonce),
      chainId: 1,
      gasLimit: tx.gasLimit.toString(),
      data: toHexString(tx.data),
      value: ethers.BigNumber.from(tx.value),
    }
    txns.push(normedTx)
  }
  return {
    hash: toHexString(block.hash()),
    transactions: <any>txns,
    parentHash: toHexString(block.header.parentHash),
    number: Number(block.header.number),
    timestamp: Number(block.header.timestamp),
    nonce: toHexString(block.header.nonce),
    difficulty: Number(block.header.difficulty),
    gasLimit: ethers.BigNumber.from(block.header.gasLimit),
    miner: block.header.coinbase.toString(),
    gasUsed: ethers.BigNumber.from(block.header.gasUsed),
    extraData: toHexString(block.header.extraData),
    _difficulty: ethers.BigNumber.from(block.header.difficulty),
  }
}
