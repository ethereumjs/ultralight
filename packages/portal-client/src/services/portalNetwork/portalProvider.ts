import { SignableENR } from '@chainsafe/enr'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { log2Distance, TransportLayer, NetworkId, PortalNetwork, DBManager } from 'portalnetwork'
import { DEFAULT_BOOTNODES } from 'portalnetwork/dist/util/bootnodes'

import { ENR } from '@chainsafe/enr'

export class TauriPortalProvider {
  portal: PortalNetwork
  historyNetwork: any
  
  constructor(portal: PortalNetwork) {
    this.portal = portal
    this.historyNetwork = portal.networks.get(NetworkId.HistoryNetwork)
  }

  
  
  static async create(db?: DBManager, options: any = {}) {

    const privateKey = await keys.generateKeyPair('secp256k1')
    const enr = SignableENR.createFromPrivateKey(privateKey)
    const nodeAddr = multiaddr(`/ip4/0.0.0.0/udp/${'9090'}`)
    enr.setLocationMultiaddr(nodeAddr)

    const portal = await PortalNetwork.create({
      transport: TransportLayer.MOBILE,
      supportedNetworks: [
        { networkId: NetworkId.HistoryNetwork },
        { networkId: NetworkId.StateNetwork },
      ],

      dataDir: './portalclient_history',
      config: {
        enr,
        bindAddrs: { ip4: nodeAddr },
        privateKey,
      },
      db,
      bootnodes: DEFAULT_BOOTNODES.mainnet,
      ...options,
    })
    
    return new TauriPortalProvider(portal)
  }
  
  async start() {
    await this.portal.start()
    await this.portal.bootstrap()
    console.log('Portal started and bootstrapped')
  }
  
  async stop() {
    if (this.portal) {
      await this.portal.stop()
      console.log('Portal stopped')
    }
  }

  getPeerInfo() {
    try {
      const known = this.historyNetwork.routingTable.values()
      const formattedKnown = known.map((enr: ENR) => {
        const distToSelf = log2Distance(this.portal.discv5.enr.nodeId, enr.nodeId)
        return [
          distToSelf,
          `${enr.ip}`,
          `${enr.getLocationMultiaddr('udp')?.nodeAddress().port}`,
          enr.nodeId,
          enr.encodeTxt(),
        ]
      })
      
      //@ts-ignore
      const sorted = formattedKnown.sort((a, b) => a[0] - b[0])
      //@ts-ignore
      const table = sorted.map((d) => {
        return [d[0], [d[1], d[2], d[3], d[4]]]
      })
      
      return {
        peers: known,
        sortedPeers: table,
      }
    } catch (error) {
      console.error('Error getting peer info:', error)
      return {
        peers: [],
        sortedPeers: [],
      }
    }
  }
  
  async getBlockByNumber(number: number) {
    try {
      if (!this.historyNetwork) {
        console.error('History network not initialized')
        return null
      }
      
      console.log(`Querying block number ${number}`)
      const block = await this.historyNetwork.content.blockbynumber(number)
      console.log('Block result:', block || 'undefined')
      return block
    } catch (error) {
      console.error(`Error querying block ${number}:`, error)
      throw error
    }
  }
}