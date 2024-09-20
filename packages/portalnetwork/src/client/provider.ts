import { hexToBytes } from '@ethereumjs/util'
import { ethers } from 'ethers'

import { addRLPSerializedBlock } from '../networks/index.js'
import { NetworkId } from '../networks/types.js'
import { toHexString } from '../util/discv5.js'
import {
  blockFromRpc,
  ethJsBlockToEthersBlock,
  ethJsBlockToEthersBlockWithTxs,
} from '../util/helpers.js'

import { PortalNetwork } from './client.js'

import type { PortalNetworkOpts } from './types.js'
import type { HistoryNetwork } from '../networks/index.js'

export class UltralightProvider extends ethers.JsonRpcProvider {
  private fallbackProvider: ethers.JsonRpcProvider
  public portal: PortalNetwork
  public historyNetwork: HistoryNetwork
  public static create = async (
    fallbackProviderUrl: string | ethers.JsonRpcProvider,
    opts: Partial<PortalNetworkOpts>,
  ) => {
    const portal = await PortalNetwork.create(opts)
    return new UltralightProvider(fallbackProviderUrl, portal)
  }
  constructor(fallbackProvider: string | ethers.JsonRpcProvider, portal: PortalNetwork) {
    const staticNetwork = ethers.Network.from('mainnet')
    super(
      typeof fallbackProvider === 'string' ? fallbackProvider : fallbackProvider._getConnection(),
      staticNetwork,
      { staticNetwork },
    )
    this.fallbackProvider =
      typeof fallbackProvider === 'string'
        ? new ethers.JsonRpcProvider(fallbackProvider, staticNetwork, { staticNetwork })
        : fallbackProvider
    this.portal = portal
    this.historyNetwork = portal.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  }

  getBlock = async (blockTag: ethers.BlockTag): Promise<ethers.Block | null> => {
    let block
    if (typeof blockTag === 'string' && blockTag.length === 66) {
      const blockHash = hexToBytes(blockTag)
      block = await this.portal.ETH.getBlockByHash(blockHash, false)
      if (block !== undefined) {
        return ethJsBlockToEthersBlock(block, this.provider)
      }
    } else if (blockTag !== 'latest') {
      const blockNum = typeof blockTag === 'number' ? blockTag : Number(BigInt(blockTag))
      block = await this.portal.ETH.getBlockByNumber(blockNum, false)
      if (block !== undefined) {
        return ethJsBlockToEthersBlock(block, this.provider)
      }
    }
    // TODO: Add block to history network if retrieved from provider
    return this.fallbackProvider.getBlock(blockTag)
  }

  getBlockWithTransactions = async (blockTag: ethers.BlockTag) => {
    let block
    const isBlockHash =
      ethers.isHexString(blockTag) && typeof blockTag === 'string' && blockTag.length === 66
    if (isBlockHash) {
      const blockHash = hexToBytes(blockTag)
      block = await this.portal.ETH.getBlockByHash(blockHash, true)
      if (block !== undefined) {
        return ethJsBlockToEthersBlockWithTxs(block, this.provider)
      }
    } else if (blockTag !== 'latest') {
      const blockNum = typeof blockTag === 'number' ? blockTag : Number(BigInt(blockTag))
      block = await this.portal.ETH.getBlockByNumber(blockNum, true)
      if (block !== undefined) {
        return ethJsBlockToEthersBlockWithTxs(block, this.provider)
      }
    }

    if (isBlockHash) {
      block = await this.fallbackProvider.send('eth_getBlockByHash', [blockTag, true])
    } else {
      const blockNum =
        typeof blockTag === 'number'
          ? blockTag
          : blockTag !== 'latest'
            ? Number(BigInt(blockTag))
            : blockTag
      block = await this.fallbackProvider.send('eth_getBlockByNumber', [blockNum, true])
    }

    const ethJSBlock = blockFromRpc(block)
    await addRLPSerializedBlock(
      toHexString(ethJSBlock.serialize()),
      block.hash,
      this.historyNetwork,
      [], // I'm too lazy to fix this right now
    )
    const ethersBlock = await ethJsBlockToEthersBlockWithTxs(ethJSBlock, this.provider)
    return ethersBlock
  }
}
