import { SignableENR } from '@chainsafe/enr'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { NetworkId, PortalNetwork, TransportLayer } from 'portalnetwork'
import { DEFAULT_BOOTNODES } from 'portalnetwork/dist/util/bootnodes'
import { createDatabase } from './db'

const isBrowser = () => {
  return typeof window !== 'undefined' && typeof window.navigator !== 'undefined'
}

const db = createDatabase({prefix: 'portalclient_history'})

export const createPortalClient = async (port = 9090) => {
  try {
    const privateKey = await keys.generateKeyPair('secp256k1')
    const enr = SignableENR.createFromPrivateKey(privateKey)
    const nodeAddr = multiaddr(`/ip4/0.0.0.0/udp/${port}`)
    enr.setLocationMultiaddr(nodeAddr)
    const client = await PortalNetwork.create({
      transport: isBrowser() ? 
        TransportLayer.WEB : TransportLayer.MOBILE,
      supportedNetworks: [
        { networkId: NetworkId.HistoryNetwork },
        { networkId: NetworkId.StateNetwork },
      ],
      db,
      dbSize: async () => 1000 * 1024 * 1024,
      config: {
        enr,
        bindAddrs: { ip4: nodeAddr },
        privateKey,
      },
      bootnodes: DEFAULT_BOOTNODES.mainnet,
    })

    await client.start()
    await client.bootstrap()
    
    await new Promise(resolve => setTimeout(resolve, 9000))
    console.log('Portal client bootstrapped', client)
    
    return client
  } catch (error) {
    console.error('Error in createPortalClient:', error)
    throw error
  }
}
