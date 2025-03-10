import { SignableENR } from '@chainsafe/enr'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { NetworkId, PortalNetwork, TransportLayer } from 'portalnetwork'
import { DEFAULT_BOOTNODES } from 'portalnetwork/dist/util/bootnodes'
import { createDatabase } from './db'
// import { AbstractLevel } from 'abstract-level'

const db = createDatabase('portalHistory', { version: 1} )
console.log('Database:', db)
export const createPortalClient = async (port = 9090) => {
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
      dataDir: './portalclient_history',
      config: {
        enr,
        bindAddrs: { ip4: nodeAddr },
        privateKey,
      },
      bootnodes: DEFAULT_BOOTNODES.mainnet,
    })

    await client.start()
    console.log('Portal client started', client)
    await client.bootstrap()
    console.log('Portal client bootstrapped', client)
    console.log('History Network:', client.networks.get(NetworkId.HistoryNetwork))
    return client
  } catch (error) {
    console.error('Error in createPortalClient:', error)
    throw error
  }
}
