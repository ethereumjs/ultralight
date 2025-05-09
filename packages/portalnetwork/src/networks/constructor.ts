import type { AbstractLevel } from 'abstract-level'
import type { NetworkId } from './types.js'
import { HistoryNetwork } from './history/index.js'
import { StateNetwork } from './state/index.js'
import { BeaconNetwork, SyncStrategy } from './beacon/index.js'
import type { PortalNetwork } from '../client/client.js'
import { bytesToHex } from '@ethereumjs/util'

interface NetworkConfig {
  client: PortalNetwork
  maxStorage?: number
  db?: { db: AbstractLevel<string, string>; path: string }
  gossipCount?: number
  dbSize: (dir: string) => Promise<number>
  trustedBlockRoot?: Uint8Array
  dataDir?: string
}

function parseNetworkId(networkId: NetworkId): { chain: string; type: string } {
  // Convert networkId to string and remove '0x' prefix
  const id = networkId.slice(2)
  
  // Last two characters determine the subnetwork type
  const typeCode = id.slice(-2)
  // First two characters determine the chain
  const chainCode = id.slice(0, 2)
  
  const typeMap: Record<string, string> = {
    '0a': 'StateNetwork',
    '0b': 'HistoryNetwork',
    '0c': 'BeaconChainNetwork',
    '0d': 'CanonicalTxIndexNetwork',
    '0e': 'VerkleStateNetwork'
  }
  
  const chainMap: Record<string, string> = {
    '50': 'mainnet',
    '4a': 'angelfood',
    '5a': 'sepolia'
  }
  
  return {
    chain: chainMap[chainCode] || 'mainnet',
    type: typeMap[typeCode] || 'Unknown'
  }
}

export function createNetwork(networkId: NetworkId, config: NetworkConfig): HistoryNetwork | StateNetwork | BeaconNetwork {
  const { chain, type } = parseNetworkId(networkId)
  const baseConfig = {
    client: config.client,
    networkId,
    maxStorage: config.maxStorage,
    db: config.db,
    gossipCount: config.gossipCount,
    dbSize: () => config.dbSize(`${config.dataDir ?? '.'}/${chain}/${type.toLowerCase()}`)
  }

  switch (type) {
    case 'HistoryNetwork':
      return new HistoryNetwork(baseConfig)
    case 'StateNetwork':
      return new StateNetwork(baseConfig)
    case 'BeaconChainNetwork':
      return new BeaconNetwork({
        ...baseConfig,
        trustedBlockRoot: config.trustedBlockRoot ? bytesToHex(config.trustedBlockRoot) : undefined,
        sync: config.trustedBlockRoot ? SyncStrategy.TrustedBlockRoot : SyncStrategy.PollNetwork
      })
    default:
      throw new Error(`Unsupported network type: ${type}`)
  }
} 