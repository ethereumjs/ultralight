import type { AbstractLevel } from 'abstract-level'
import type { NetworkId } from './types.js'
import { LegacyHistoryNetwork } from './history/index.js'
import { LegacyStateNetwork } from './state/index.js'
import { LegacyBeaconNetwork, SyncStrategy } from './beacon/index.js'
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
    '0a': 'LegacyStateNetwork',
    '0b': 'LegacyHistoryNetwork',
    '0c': 'LegacyBeaconChainNetwork',
    '0d': 'LegacyCanonicalTxIndexNetwork',
    '0e': 'LegacyVerkleStateNetwork'
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

export function createNetwork(networkId: NetworkId, config: NetworkConfig): LegacyHistoryNetwork | LegacyStateNetwork | LegacyBeaconNetwork {
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
    case 'LegacyHistoryNetwork':
      return new LegacyHistoryNetwork(baseConfig)
    case 'LegacyStateNetwork':
      return new LegacyStateNetwork(baseConfig)
    case 'LegacyBeaconChainNetwork':
      return new LegacyBeaconNetwork({
        ...baseConfig,
        trustedBlockRoot: config.trustedBlockRoot ? bytesToHex(config.trustedBlockRoot) : undefined,
        sync: config.trustedBlockRoot ? SyncStrategy.TrustedBlockRoot : SyncStrategy.PollNetwork
      })
    default:
      throw new Error(`Unsupported network type: ${type}`)
  }
} 