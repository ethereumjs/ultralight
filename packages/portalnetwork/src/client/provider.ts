import { ethers } from 'ethers'
import { HistoryProtocol, ProtocolId } from '../subprotocols/index.js'
import { ethJsBlockToEthersBlock } from '../util/helpers.js'
import { PortalNetwork } from './client.js'
import { PortalNetworkOpts } from './types.js'

export class UltralightProvider extends ethers.providers.StaticJsonRpcProvider {
  private fallbackProvider:
    | ethers.providers.StaticJsonRpcProvider
    | ethers.providers.JsonRpcProvider
  public portal: PortalNetwork
  public historyProtocol: HistoryProtocol
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

  public static create = async (
    fallbackProviderUrl: string | ethers.providers.JsonRpcProvider,
    network = 1,
    opts: Partial<PortalNetworkOpts>
  ) => {
    const portal = await PortalNetwork.create(opts)
    return new UltralightProvider(fallbackProviderUrl, network, portal)
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
}
