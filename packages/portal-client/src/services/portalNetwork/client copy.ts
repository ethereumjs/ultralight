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

  async init(bindPort: number = 9090, udpPort: number = 8545): Promise<void> {
    try {
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

      this.logger('Portal Network initialized successfully')
      this.logger('History Network status:', !!this.historyNetwork)
      this.logger('State Network status:', !!this.stateNetwork)
      this.logger(this.node)
    } catch (error) {
      console.log('Portal Network initialization failed:', error)
      throw error
    }

    process.on('uncaughtException', (err) => {
      console.log('Uncaught Exception:', err)
    })

    process.on('SIGINT', async () => {
      await this.shutdown()
    })
  }

  async shutdown(): Promise<void> {
    this.logger('Shutting down Portal Network node...')
    await this.node?.stop()
    await this.udpHandler?.stop()
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

  getUDPHandler(): PortalUDPHandler | undefined {
    return this.udpHandler;
  }

  // Network operation methods
  async bootstrap(): Promise<void> {
    await this.node?.bootstrap()
  }

}

async function initializePortalNetwork(
  bindPort: number = 9090,
  udpPort: number = 8545,
): Promise<PortalClient> {
  const node = new PortalClient()
  await node.init(bindPort, udpPort)
  return node
}

async function main() {
  try {
    const bindPort = parseInt(process.env.BIND_PORT || '9090');
    const udpPort = parseInt(process.env.UDP_PORT || '8545');
    
    const node = await initializePortalNetwork(bindPort, udpPort);
    
    // Add error handling for the UDP socket
    const udpHandler = node.getUDPHandler();
    if (udpHandler) {
      udpHandler.on('error', (error) => {
        console.error('UDP Socket error:', error);
      });
    }

    // Handle process signals
    process.on('SIGINT', async () => {
      await node.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await node.shutdown();
      process.exit(0);
    });

    // Log successful startup
    console.log(`Portal Network started on ports: ${bindPort} (bind) / ${udpPort} (UDP)`);
  } catch (error) {
    console.error('Error initializing Portal Network:', error);
    process.exit(1);
  }
}

// Ensure we catch any top-level errors
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});