import { ethers } from 'ethers'
import { addRLPSerializedBlock, HistoryProtocol } from '../subprotocols/index.js'
import { ProtocolId } from '../subprotocols/types.js'
import { toHexString } from '../util/discv5.js'
import {
  ethJsBlockToEthersBlock,
  ethJsBlockToEthersBlockWithTxs,
  blockFromRpc,
} from '../util/helpers.js'
import { PortalNetwork } from './client.js'
import { PortalNetworkOpts } from './types.js'

export class UltralightProvider extends ethers.JsonRpcProvider {
  private fallbackProvider: ethers.JsonRpcProvider
  public portal: PortalNetwork
  public historyProtocol: HistoryProtocol
  public static create = async (
    fallbackProviderUrl: string | ethers.JsonRpcProvider,
    network = 1,
    opts: Partial<PortalNetworkOpts>,
  ) => {
    const portal = await PortalNetwork.create(opts)
    return new UltralightProvider(fallbackProviderUrl, network, portal)
  }
  constructor(
    fallbackProvider: string | ethers.JsonRpcProvider,
    network = 1,
    portal: PortalNetwork,
  ) {
    super(
      //@ts-ignore
      typeof fallbackProvider === 'string' ? fallbackProvider : fallbackProvider.#connect.url,
      network,
    )
    this.fallbackProvider =
      typeof fallbackProvider === 'string'
        ? new ethers.JsonRpcProvider(fallbackProvider, network)
        : fallbackProvider
    this.portal = portal
    this.historyProtocol = portal.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  }

  getBlock = async (blockTag: ethers.BlockTag) => {
    let block
    if (typeof blockTag === 'string' && blockTag.length === 66) {
      block = await this.historyProtocol?.ETH.getBlockByHash(blockTag, false)
      if (block !== undefined) {
        return ethJsBlockToEthersBlock(block, this.provider)
      }
    } else if (blockTag !== 'latest') {
      const blockNum = typeof blockTag === 'number' ? blockTag : Number(BigInt(blockTag))
      block = await this.historyProtocol?.ETH.getBlockByNumber(blockNum, false)
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
      block = await this.historyProtocol?.ETH.getBlockByHash(blockTag, true)
      if (block !== undefined) {
        return ethJsBlockToEthersBlockWithTxs(block, this.provider)
      }
    } else if (blockTag !== 'latest') {
      const blockNum = typeof blockTag === 'number' ? blockTag : Number(BigInt(blockTag))
      block = await this.historyProtocol?.ETH.getBlockByNumber(blockNum, true)
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
    addRLPSerializedBlock(toHexString(ethJSBlock.serialize()), block.hash, this.historyProtocol)
    const ethersBlock = ethJsBlockToEthersBlockWithTxs(ethJSBlock, this.provider)
    return ethersBlock
  }
}
