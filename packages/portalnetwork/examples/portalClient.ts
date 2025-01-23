import { SignableENR, ENR } from '@chainsafe/enr'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { PortalNetwork, NetworkId, TransportLayer, HistoryNetwork, StateNetwork } from '../../portalnetwork/src'
import repl from 'repl'

class PortalNetworkRepl {
  private node?: PortalNetwork
  private historyNetwork?: any
  private stateNetwork?: any

  async init(port = 9090): Promise<void> {
    const privateKey = await keys.generateKeyPair('secp256k1')
    const enr = SignableENR.createFromPrivateKey(privateKey)
    const nodeAddr = multiaddr(`/ip4/127.0.0.1/udp/${port}`)
    enr.setLocationMultiaddr(nodeAddr)

    this.node = await PortalNetwork.create({
      transport: TransportLayer.NODE,
      supportedNetworks: [
        { networkId: NetworkId.HistoryNetwork },
        { networkId: NetworkId.StateNetwork },
      ],
      config: {
        enr,
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

    // this.historyNetwork = this.node.networks[NetworkId.HistoryNetwork]
    // this.stateNetwork = this.node.networks[NetworkId.StateNetwork]

    this.startRepl()
  }

  private startRepl(): void {
    const replServer = repl.start('portal> ')

    const defineNetworkCommand = (commandName: string, methodName: string) => {
      replServer.defineCommand(commandName, {
        help: `Send ${methodName} to network (history/state)`,
        async action(args: string) {
          const context = this.context as any
          const portalRepl: PortalNetworkRepl = context.portalRepl

          const [network, ...params] = args.split(' ')
          let enrObject;

          try {
            // Decode ENR if first param is an ENR string
            if (params[0] && params[0].startsWith('enr:')) {
              enrObject = ENR.decodeTxt(params[0])
            }

            const networkChoice = network.toLowerCase() === 'history' 
              ? portalRepl.historyNetwork 
              : portalRepl.stateNetwork

            if (!networkChoice) {
              console.log(`${network} Network not initialized`)
              return this.displayPrompt()
            }

            const method = networkChoice[methodName]
            if (!method) {
              console.log(`Method ${methodName} not found`)
              return this.displayPrompt()
            }

            const result = enrObject 
              ? await method(enrObject, ...params.slice(1)) 
              : await method(...params)

            console.log(`${methodName} result:`, result)
          } catch (error) {
            console.error(`${methodName} failed:`, error)
          }
          this.displayPrompt()
        }
      })
    }

    // Define commands for various network methods
    defineNetworkCommand('ping', 'sendPing')
    defineNetworkCommand('findnodes', 'sendFindNodes')
    defineNetworkCommand('findcontent', 'sendFindContent')
    defineNetworkCommand('offer', 'sendOffer')

    replServer.context.portalRepl = this

    replServer.on('exit', async () => {
      console.log('Shutting down Portal Network node...')
      await this.node?.stop()
      process.exit(0)
    })
  }
}

async function main() {
  const repl = new PortalNetworkRepl()
  await repl.init()
}

main().catch(console.error)