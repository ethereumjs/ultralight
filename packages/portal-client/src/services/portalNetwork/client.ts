import { SignableENR } from '@chainsafe/enr'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { PortalNetwork, NetworkId, TransportLayer, BaseNetwork } from 'portalnetwork'
import debug, { Debugger } from 'debug'
import { DEFAULT_BOOTNODES } from 'portalnetwork/dist/util/bootnodes'
import { PortalUDPHandler } from './portalUDPHandler'

const portalClientDebugString = 'PortalClient'

export class PortalClient {
  private node?: PortalNetwork
  private historyNetwork?: BaseNetwork
  private stateNetwork?: BaseNetwork
  private enr?: SignableENR
  private udpHandler?: PortalUDPHandler
  private logger: Debugger = debug(portalClientDebugString)
  private isInitialized: boolean = false

  async init(bindPort: number = 9090, udpPort: number = 8545): Promise<void> {
    if (this.isInitialized) {
      await this.shutdown()
    }

    try {
      if (bindPort <= 0) {
        throw new Error('Invalid bind port number')
      }

      const privateKey = await keys.generateKeyPair('secp256k1')
      this.enr = SignableENR.createFromPrivateKey(privateKey)

      const nodeAddr = multiaddr(`/ip4/0.0.0.0/udp/${bindPort}`)
      this.enr.setLocationMultiaddr(nodeAddr)

      this.node = await PortalNetwork.create({
        transport: TransportLayer.NODE,
        supportedNetworks: [
          { networkId: NetworkId.HistoryNetwork },
          { networkId: NetworkId.StateNetwork },
        ],
        config: {
          enr: this.enr,
          bindAddrs: { ip4: nodeAddr },
          privateKey,
        },
        bootnodes: DEFAULT_BOOTNODES.mainnet,
      })

      this.historyNetwork = this.node.network()['0x500b']!
      this.stateNetwork = this.node.network()['0x500a']!

      this.udpHandler = new PortalUDPHandler(this.node, '127.0.0.1', udpPort)

      await this.node.start()
      await this.udpHandler.start()
      this.node.enableLog(portalClientDebugString)
      this.isInitialized = true

      this.logger('Portal Network initialized successfully')
      this.logger(`Bind Port: ${bindPort}`)
      this.logger('History Network status:', !!this.historyNetwork)
      this.logger('State Network status:', !!this.stateNetwork)
    } catch (error) {
      this.logger('Portal Network initialization failed:', error)
      await this.cleanup()
      throw error
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await this.node?.stop()
    } catch (error) {
      this.logger('Cleanup error:', error)
    }
    this.isInitialized = false
    this.node = undefined
  }

  async shutdown(): Promise<void> {
    this.logger('Shutting down Portal Network node...')
    await this.cleanup()
  }

  getHistoryNetwork(): BaseNetwork | undefined {
    return this.historyNetwork
  }

  getStateNetwork(): BaseNetwork | undefined {
    return this.stateNetwork
  }

  getNode(): PortalNetwork | undefined {
    return this.node
  }

  async bootstrap(): Promise<void> {
    await this.node?.bootstrap()
  }
}

async function initializePortalNetwork(bindPort: number, udpPort: number): Promise<PortalClient> {
  const node = new PortalClient()
  await node.init(bindPort, udpPort)
  return node
}

async function main() {
  let node: PortalClient | undefined

  try {
    const bindPort = parseInt(process.env.BIND_PORT || '9090')
    const udpPort = parseInt(process.env.UDP_PORT || '8545')
    
    node = await initializePortalNetwork(bindPort, udpPort)
    
    // Proper cleanup on process signals
    const cleanup = async () => {
      if (node) {
        await node.shutdown()
      }
      process.exit(0)
    }

    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
    
    console.log(`Portal Network started on bind port: ${bindPort}`)
  } catch (error) {
    console.error('Error initializing Portal Network:', error)
    if (node) {
      await node.shutdown()
    }
    process.exit(1)
  }
}

// Handle top-level errors
main().catch(async (error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})