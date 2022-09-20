import { ethers } from 'ethers'
import { HistoryProtocol, ProtocolId } from '../subprotocols/index.js'
import {
  ethJsBlockToEthersBlock,
  ethJsBlockToEthersBlockWithTxs,
  blockFromRpc,
} from '../util/helpers.js'
import { PortalNetwork } from './client.js'
import { PortalNetworkOpts } from './types.js'

export class UltralightProvider extends ethers.providers.StaticJsonRpcProvider {
  private fallbackProvider:
    | ethers.providers.StaticJsonRpcProvider
    | ethers.providers.JsonRpcProvider
  public portal: PortalNetwork
  public historyProtocol: HistoryProtocol
  public static create = async (
    fallbackProviderUrl: string | ethers.providers.JsonRpcProvider,
    network = 1,
    opts: Partial<PortalNetworkOpts>
  ) => {
    const portal = await PortalNetwork.create(opts)
    return new UltralightProvider(fallbackProviderUrl, network, portal)
  }
  constructor(
    fallbackProvider: string | ethers.providers.JsonRpcProvider,
    network = 1,
    portal: PortalNetwork
  ) {
    super(
      typeof fallbackProvider === 'string' ? fallbackProvider : fallbackProvider.connection,
      network
    )
    this.fallbackProvider =
      typeof fallbackProvider === 'string'
        ? new ethers.providers.StaticJsonRpcProvider(fallbackProvider, network)
        : fallbackProvider
    this.portal = portal
    this.historyProtocol = portal.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  }

  getBlock = async (blockTag: ethers.providers.BlockTag) => {
    let block
    if (typeof blockTag === 'string' && blockTag.length === 66) {
      block = await this.historyProtocol?.ETH.getBlockByHash(blockTag, false)
      if (block !== undefined) {
        return ethJsBlockToEthersBlock(block)
      }
    } else if (blockTag !== 'latest') {
      const blockNum = typeof blockTag === 'number' ? blockTag : parseInt(blockTag)
      block = await this.historyProtocol?.ETH.getBlockByNumber(blockNum, false)
      if (block !== undefined) {
        return ethJsBlockToEthersBlock(block)
      }
    }
    // TODO: Add block to history network if retrieved from provider
    return this.fallbackProvider.getBlock(blockTag)
  }

  getBlockWithTransactions = async (blockTag: ethers.providers.BlockTag) => {
    let block
    const isBlockHash =
      ethers.utils.isHexString(blockTag) && typeof blockTag === 'string' && blockTag.length === 66
    if (isBlockHash) {
      block = await this.historyProtocol?.ETH.getBlockByHash(blockTag, true)
      if (block !== undefined) {
        return ethJsBlockToEthersBlockWithTxs(block)
      }
    } else if (blockTag !== 'latest') {
      const blockNum = typeof blockTag === 'number' ? blockTag : parseInt(blockTag)
      block = await this.historyProtocol?.ETH.getBlockByNumber(blockNum, true)
      if (block !== undefined) {
        return ethJsBlockToEthersBlockWithTxs(block)
      }
    }
    // TODO: Add block to history network if retrieved from provider

    if (isBlockHash) {
      block = await this.fallbackProvider.send('eth_getBlockByHash', [blockTag, true])
    } else {
      const blockNum =
        typeof blockTag === 'number'
          ? blockTag
          : blockTag !== 'latest'
          ? parseInt(blockTag)
          : blockTag
      block = await this.fallbackProvider.send('eth_getBlockByNumber', [blockNum, true])
    }

    const ethJSBlock = blockFromRpc(block)
    return block
  }
}
