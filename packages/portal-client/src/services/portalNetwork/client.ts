import { DEFAULT_DB_SIZE, STARTUP_DELAY_MS } from '@/utils/constants/config'
import { SignableENR } from '@chainsafe/enr'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { DEFAULT_BOOTNODES, NetworkId, TransportLayer, createPortalNetwork } from 'portalnetwork'
import { createDatabase } from './db'
import { TauriUDPTransportService } from './transports'

import type { Multiaddr } from '@multiformats/multiaddr'
import type { PortalNetwork } from 'portalnetwork'

let client: PortalNetwork

export const createPortalClient = async (port: number): Promise<PortalNetwork> => {
  const db = createDatabase('network_db', { prefix: '', version: 2 })

  const createNetwork = async (rebuildFromMemory: boolean): Promise<PortalNetwork> => {
    let privateKey: any
    if (rebuildFromMemory) {
      privateKey = await db.getPrivateKey()
    } else {
      privateKey = await keys.generateKeyPair('secp256k1')
      await db.savePrivateKey(privateKey)
    }

    const enr = SignableENR.createFromPrivateKey(privateKey)
    const nodeAddr = multiaddr(`/ip4/0.0.0.0/udp/${port}`)
    enr.setLocationMultiaddr(nodeAddr)

    return createPortalNetwork({
      transport: TransportLayer.TAURI,
      supportedNetworks: [
        { networkId: NetworkId.HistoryNetwork },
        { networkId: NetworkId.StateNetwork },
      ],
      db,
      rebuildFromMemory,
      dbSize: async () => DEFAULT_DB_SIZE,
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
  }

  try {
    client = await createNetwork(true)
  } catch (error) {
    console.error('Failed to create node from memory, creating from scratch:', error)
    client = await createNetwork(false)
  }

  await client.start()
  await client.storeNodeDetails()

  client.enableLog('*Portal*')

  // @ts-expect-error Window is available in browser
  window.portal = client // add portal to window to allow for direct access to portalnetwork client
  await new Promise((resolve) => setTimeout(resolve, STARTUP_DELAY_MS))

  return client
}
