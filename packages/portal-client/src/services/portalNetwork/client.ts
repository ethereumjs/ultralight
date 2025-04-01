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

import type { PortalNetwork } from 'portalnetwork'
// const isBrowser = () => !window.__TAURI__

const db = createDatabase('network_db', { prefix: 'portalclient_' })

export const createPortalClient = async (port: number): Promise<PortalNetwork> => {
  try {
    const privateKey = await keys.generateKeyPair('secp256k1')
    const enr = SignableENR.createFromPrivateKey(privateKey)
    const nodeAddr = multiaddr(`/ip4/0.0.0.0/udp/${port}`)
    enr.setLocationMultiaddr(nodeAddr)
    const client = await createPortalNetwork({
      transport: TransportLayer.MOBILE,
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
      // bootnodes: ['enr:-JG4QIr-TqfTiuOR4vqCcylmFbr7_fb4z8EjUiQfARVmgXwpaLIx4nS6H-wKMagfXR1xdxMSt-BZOoviqMK-khaDKtQGY4d1IDAuMC4xgmlkgnY0gmlwhH8AAAGCcHYAiXNlY3AyNTZrMaEDGUf9MP98h9jH_ywK0VFWJNJHlw-Ubv2ocuiEpDKrtjSDdWRwgiMo'],
      bootnodes: DEFAULT_BOOTNODES.mainnet,
    })

    await client.start()
    await client.bootstrap()
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Portal client bootstrapped', client)
    
    return client
  } catch (error) {
    console.error('Error in createPortalClient:', error)
    throw error
  }
}
