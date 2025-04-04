import { SignableENR } from '@chainsafe/enr'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { 
  NetworkId,
  TransportLayer,
  createPortalNetwork,
  DEFAULT_BOOTNODES,
} from 'portalnetwork'
import { createDatabase } from './db'
import { TauriUDPTransportService } from './transports'

import type { PortalNetwork } from 'portalnetwork'
import type { Multiaddr } from '@multiformats/multiaddr'
// const isBrowser = () => !window.__TAURI__

const db = createDatabase('network_db', { prefix: 'portalclient_' })

export const createPortalClient = async (port: number): Promise<PortalNetwork> => {
  try {
    const privateKey = await keys.generateKeyPair('secp256k1')
    const enr = SignableENR.createFromPrivateKey(privateKey)
    const nodeAddr = multiaddr(`/ip4/0.0.0.0/udp/${port}`)
    enr.setLocationMultiaddr(nodeAddr)
    const client = await createPortalNetwork({
      transport: TransportLayer.TAURI,
      supportedNetworks: [
        { networkId: NetworkId.HistoryNetwork },
        { networkId: NetworkId.StateNetwork },
      ],
      db,
      dbSize: async () => 1024 * 1024 * 1024,
      config: {
        enr,
        bindAddrs: { ip4: nodeAddr },
        privateKey,
      },
      bootnodes: DEFAULT_BOOTNODES.mainnet,
      transportServices: {
        createTauriTransport: (bindAddr: Multiaddr, nodeId: string) => {
          return new TauriUDPTransportService(bindAddr, nodeId)
        },
      },
    })

    await client.start()
    await client.bootstrap()
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return client
  } catch (error) {
    throw error
  }
}
