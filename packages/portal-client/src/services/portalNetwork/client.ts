import { SignableENR } from '@chainsafe/enr'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { NetworkId, PortalNetwork, TransportLayer } from 'portalnetwork'
import { DEFAULT_BOOTNODES } from 'portalnetwork/dist/util/bootnodes'
import { createDatabase } from './db'

// const isBrowser = () => !window.__TAURI__

const db = createDatabase('portal-client-db', {prefix: 'portalclient_history'})

export const createPortalClient = async (port: number, proxyAddress: string): Promise<PortalNetwork> => {
  try {
    const privateKey = await keys.generateKeyPair('secp256k1')
    const enr = SignableENR.createFromPrivateKey(privateKey)
    const nodeAddr = multiaddr(`/ip4/0.0.0.0/udp/${port}`)
    enr.setLocationMultiaddr(nodeAddr)
    const client = await PortalNetwork.create({
      transport: TransportLayer.MOBILE,
      supportedNetworks: [
        { networkId: NetworkId.HistoryNetwork },
        { networkId: NetworkId.StateNetwork },
      ],
      db,
      proxyAddress,
      dbSize: async () => 1000 * 1024 * 1024,
      config: {
        enr,
        bindAddrs: { ip4: nodeAddr },
        privateKey,
      },
      // bootnodes: ['enr:-I24QIRhfeRScXqGwrG9yrEgL0ndg40XbuwJSgNulPzCmwpAGYktxM35h3GUQX_EvcfdU1YnjIjjInufI_Mqfu0G5RAEY4d1IDAuMC4xgmlkgnY0gmlwhH8AAAGJc2VjcDI1NmsxoQMZR_0w_3yH2Mf_LArRUVYk0keXD5Ru_ahy6ISkMqu2NIN1ZHCCIyg'],
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
