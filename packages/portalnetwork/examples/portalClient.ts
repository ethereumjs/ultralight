import { SignableENR, ENR } from '@chainsafe/enr'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { 
  PortalNetwork, 
  NetworkId, 
  TransportLayer, 
  BaseNetwork, 
  HistoryNetwork, 
  StateNetwork,
} from '../../portalnetwork/src'
import repl from 'repl'
import { hexToBytes } from '@ethereumjs/util'
import debug, { Debugger } from 'debug'

class PortalNetworkRepl {
  private node?: PortalNetwork
  private historyNetwork?: BaseNetwork
  private stateNetwork?: BaseNetwork
  private enr?: SignableENR
  private logger: Debugger

  async init(port = 9090): Promise<void> {
    try {
      const privateKey = await keys.generateKeyPair('secp256k1')
      this.enr = SignableENR.createFromPrivateKey(privateKey)

      this.logger = debug(this.enr.nodeId.slice(0, 5)).extend('Portal')

      const nodeAddr = multiaddr(`/ip4/127.0.0.1/udp/${port}`)
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
      })

      this.historyNetwork = new HistoryNetwork({
        client: this.node,
        networkId: NetworkId.HistoryNetwork
      })
      this.stateNetwork = new StateNetwork({
        client: this.node,
        networkId: NetworkId.StateNetwork
      })

      this.node.networks[NetworkId.HistoryNetwork] = this.historyNetwork
      this.node.networks[NetworkId.StateNetwork] = this.stateNetwork

      await this.node.start()

      this.node.enableLog('*Portal*,*uTP*,*discv5*')

      this.logger('Portal Network initialized successfully')
      this.logger('History Network status:', !!this.historyNetwork)
      this.logger('State Network status:', !!this.stateNetwork)

      this.setupEventListeners()
      this.startRepl()
    } catch (error) {
      console.log('Portal Network initialization failed', error)
      process.exit(1)
    }
  }

  private setupEventListeners(): void {
    if (!this.node) return

    this.node.on('SendTalkReq', (nodeId, requestId, payload) => 
      this.logger('Sent talk request', { nodeId, requestId, payload }))
    
    this.node.on('SendTalkResp', (nodeId, requestId, payload) => 
      this.logger('Received talk response', { nodeId, requestId, payload }))
  }

  private startRepl(): void {
    const replServer = repl.start('portal> ')

    replServer.defineCommand('ping', {
      help: 'Send ping to network (history/state)',
      async action(network: string) {
        const context = this.context as any
        const portalRepl: PortalNetworkRepl = context.portalRepl

        try {
          const networkObj = network.toLowerCase() === 'history' 
            ? portalRepl.historyNetwork 
            : portalRepl.stateNetwork

          if (!networkObj) {
            portalRepl.logger(`${network} Network not initialized`)
            return this.displayPrompt()
          }

          const enr = ENR.decodeTxt(networkObj.enr.encodeTxt())
          const res = await networkObj.sendPing(enr)
          portalRepl.logger(`Ping response for ${network} network:`, res)
        } catch (error) {
          portalRepl.logger(`Ping to ${network} network failed`, error)
        }
        this.displayPrompt()
      }
    })

    replServer.defineCommand('findnodes', {
      help: 'Find nodes in network (history/state) with ENR and distances',
      async action(args: string) {
        const context = this.context as any
        const portalRepl: PortalNetworkRepl = context.portalRepl

        const [network, enr, ...distancesStr] = args.split(' ')
        const distances = distancesStr.map(d => parseInt(d, 10))

        try {
          switch (network.toLowerCase()) {
            case 'history':
              if (!portalRepl.historyNetwork) {
                console.log('History Network not initialized')
                break
              }
              const enrObject = ENR.decodeTxt(enr)
              await portalRepl.historyNetwork.sendFindNodes(enrObject, distances)
              break
            case 'state':
              if (!portalRepl.stateNetwork) {
                console.log('State Network not initialized')
                break
              }
              const enrObject2 = ENR.decodeTxt(enr)
              await portalRepl.stateNetwork.sendFindNodes(enrObject2, distances)
              break
            default:
              console.log('Invalid network. Choose "history" or "state"')
          }
        } catch (error) {
          console.log('Find nodes failed:', error)
        }
        this.displayPrompt()
      }
    })

    replServer.defineCommand('findcontent', {
      help: 'Find content in network (history/state) with ENR and content key. Usage: .findcontent <network> <enr> <contentKey>',
      async action(args: string) {
        try {

          const context = this.context as any
          const portalRepl: PortalNetworkRepl = context.portalRepl

          const parts = args.trim().split(/\s+/)
          if (parts.length !== 3) {
            portalRepl.logger('Invalid arguments. Usage: findcontent <network> <enr> <contentKey>')
            return this.displayPrompt()
          }

          const [network, enr, contentKey] = parts

          const networkObj = network.toLowerCase() === 'history' 
            ? portalRepl.historyNetwork 
            : portalRepl.stateNetwork

          if (!networkObj) {
            portalRepl.logger(`${network} Network not initialized`)
            return this.displayPrompt()
          }

          let parsedEnr
          try {
            parsedEnr = ENR.decodeTxt(enr)
          } catch (enrError) {
            portalRepl.logger('Invalid ENR format:', enrError)
            return this.displayPrompt()
          }

          let contentBytes
          try {
            contentBytes = hexToBytes(contentKey)
          } catch (hexError) {
            portalRepl.logger('Invalid content key format. Must be a hex string:', hexError)
            return this.displayPrompt()
          }

          if (!networkObj.sendFindContent) {
            portalRepl.logger('sendFindContent method not available')
            return this.displayPrompt()
          }

          const content = await networkObj.sendFindContent(parsedEnr, contentBytes)
          portalRepl.logger('Content found:', content)
        } catch (error) {
          console.log('Find content operation failed', error)
        }
        this.displayPrompt()
      }
    })

    replServer.defineCommand('offer', {
      help: 'Offer content to a specific network. Usage: .offer <network> <enr> <contentKey> <contentValue>',
      async action(args: string) {
        try {

          const context = this.context as any
          const portalRepl: PortalNetworkRepl = context.portalRepl

          const parts = args.trim().split(/\s+/)

          if (parts.length < 4) {
            portalRepl.logger('Invalid arguments. Usage: .offer <network> <enr> <contentKey> <contentValue>')
            return this.displayPrompt()
          }

          const [network, enr, contentKey, ...contentValueParts] = parts
          const contentValue = contentValueParts.join(' ')

          const networkObj = network.toLowerCase() === 'history' 
            ? portalRepl.historyNetwork 
            : portalRepl.stateNetwork

          if (!networkObj) {
            portalRepl.logger(`${network} Network not initialized`)
            return this.displayPrompt()
          }

          let parsedEnr
          try {
            parsedEnr = ENR.decodeTxt(enr)
          } catch (enrError) {
            portalRepl.logger('Invalid ENR format: %O', enrError)
            return this.displayPrompt()
          }

          let contentKeyBytes, contentValueBytes
          try {
            contentKeyBytes = hexToBytes(contentKey)
            contentValueBytes = new TextEncoder().encode(contentValue)
          } catch (encodeError) {
            console.log('Content encoding failed: %O', encodeError)
            return this.displayPrompt()
          }

          const MAX_CONTENT_SIZE = 2 * 1024 * 1024
          if (contentValueBytes.length > MAX_CONTENT_SIZE) {
            portalRepl.logger(`Content exceeds maximum size of ${MAX_CONTENT_SIZE} bytes`)
            return this.displayPrompt()
          }

          portalRepl.logger('Sending content offer: network=%s, key=%o', network, contentKeyBytes)
          
          let offerResult
          try {
            offerResult = await networkObj.sendOffer(
              parsedEnr,
              contentKeyBytes,
              contentValueBytes,
            )

            portalRepl.logger('Content offer result: %O', offerResult)
          } catch (offerError) {
            console.log('Content offer failed: %O', offerError)
          }
        } catch (error) {
          console.log('Offer operation failed: %O', error)
        }
        
        this.displayPrompt()
      }
    })

    replServer.defineCommand('status', {
      help: 'Show current Portal Network status',
      action() {
        const context = this.context as any
        const portalRepl: PortalNetworkRepl = context.portalRepl
        portalRepl.logger('Portal Network Status:')
        portalRepl.logger('History Network:', !!portalRepl.historyNetwork)
        portalRepl.logger('State Network:', !!portalRepl.stateNetwork)
        portalRepl.logger('Node initialized:', !!portalRepl.node)

        this.displayPrompt()
      }
    })

    replServer.context.portalRepl = this

    replServer.on('exit', async () => {
      this.logger('Shutting down Portal Network node...')
      await this.node?.stop()
      process.exit(0)
    })
  }
}

async function main() {
  try {
    const repl = new PortalNetworkRepl()
    await repl.init()
  } catch (error) {
    console.log('Initialization failed', error)
    process.exit(1)
  }
}

main().catch(err => {
  console.log('Unhandled error in main', err)
  process.exit(1)
})
