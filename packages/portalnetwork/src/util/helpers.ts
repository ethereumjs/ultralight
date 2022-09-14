import { ethers } from 'ethers'
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
