import { BlockTag, StaticJsonRpcProvider } from '@ethersproject/providers'
import { PortalNetwork } from './client.js'
import { PortalNetworkOpts } from './types.js'

export class UltralightProvider extends StaticJsonRpcProvider {
  private fallbackProvider: StaticJsonRpcProvider
  private portal: PortalNetwork | undefined
  private portalOpts: Partial<PortalNetworkOpts>
  constructor(fallbackProviderUrl: string, network = 1, opts: Partial<PortalNetworkOpts>) {
    super()
    this.fallbackProvider = new StaticJsonRpcProvider(fallbackProviderUrl, network)
    this.portalOpts = opts
  }

  init = async () => {
    this.portal = await PortalNetwork.create({ ...this.portalOpts })
  }

  getBlock = (blockTag: BlockTag) => this.fallbackProvider.getBlock(blockTag)
}
