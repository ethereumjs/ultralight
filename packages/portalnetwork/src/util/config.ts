import { SignableENR } from '@chainsafe/enr'
import { type PrefixedHexString, hexToBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { Level } from 'level'

import { NetworkId } from '../networks/types.js'

import { setupMetrics } from './metrics.js'

import { ChainId, type NetworkConfig, type PortalNetworkOpts, SupportedVersions } from '../client/index.js'
import { DEFAULT_BOOTNODES } from './bootnodes.js'

export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : any

export interface PortalClientOpts {
  chainId?: string
  pk?: string
  bootnode?: string
  bindAddress?: string
  bootnodeList?: string[]
  dataDir?: string
  networks: string
  storage: string
  trustedBlockRoot?: string
  gossipCount?: number
  supportedVersions?: number[]
}

export const NetworkStrings: Record<ChainId, Record<string, NetworkId>> = {
  [ChainId.MAINNET]: {
    history: NetworkId.HistoryNetwork,
    beacon: NetworkId.BeaconChainNetwork,
    state: NetworkId.StateNetwork,
  },
  [ChainId.SEPOLIA]: {
    history: NetworkId.SepoliaHistoryNetwork,
    beacon: NetworkId.SepoliaBeaconChainNetwork,
    state: NetworkId.SepoliaStateNetwork,
  },
  [ChainId.ANGELFOOD]: {
    history: NetworkId.AngelFoodHistoryNetwork,
    beacon: NetworkId.AngelFoodBeaconChainNetwork,
    state: NetworkId.AngelFoodStateNetwork,
  },
}

export const cliConfig = async (args: PortalClientOpts) => {
  const chainId = args.chainId ? ChainId[args.chainId.toUpperCase() as keyof typeof ChainId] : ChainId.MAINNET
  const ip = args.bindAddress !== undefined ? args.bindAddress.split(':')[0] : '0.0.0.0'
  const bindPort = args.bindAddress !== undefined ? args.bindAddress.split(':')[1] : 9000 // Default discv5 port
  let privateKey: AsyncReturnType<typeof keys.generateKeyPair>
  try {
    if (args.pk === undefined) {
      privateKey = await keys.generateKeyPair('secp256k1')
    } else {
      privateKey = keys.privateKeyFromRaw(hexToBytes(args.pk as PrefixedHexString).slice(-32))
    }
  } catch (err: any) {
    throw new Error(`Error using pk: ${args.pk}\n${err.message}`)
  }
  const enr = SignableENR.createFromPrivateKey(privateKey)
  const initMa = multiaddr(`/ip4/${ip}/udp/${bindPort}`)
  enr.setLocationMultiaddr(initMa)
  enr.set('pv', SupportedVersions.serialize(args.supportedVersions ?? [0]))
  let db
  if (args.dataDir !== undefined) {
    db = new Level<string, string>(args.dataDir)
  }
  const config = {
    chainId,
    enr,
    privateKey,
    config: {
      enrUpdate: true,
      addrVotesToUpdateEnr: 5,
      allowUnverifiedSessions: true,
      requestTimeout: 3000,
    },
    bindAddrs: {
      ip4: initMa,
    },
    trustedBlockRoot: args.trustedBlockRoot,
  } as any
  const networks: NetworkConfig[] = []
  const argsNetworks = args.networks.split(',')
  const argsStorage = args.storage.split(',').map((x) => Number.parseInt(x))
  for (const [i, network] of argsNetworks.entries()) {
    let networkdb
    if (args.dataDir !== undefined) {
      networkdb = {
        db: new Level<string, string>(args.dataDir + '/' + network, { createIfMissing: true }),
        path: args.dataDir + '/' + network,
      }
    }
    networks.push({
      networkId: NetworkStrings[chainId][network],
      maxStorage: argsStorage[i],
      //@ts-ignore Because level doesn't know how to get along with itself
      db: networkdb,
    })
  }

  const bootnodes: Array<string> = []
  if (args.bootnode !== undefined) {
    bootnodes.push(args.bootnode)
  }
  if (args.bootnodeList !== undefined) {
    for (const bootnode of args.bootnodeList) {
      bootnodes.push(bootnode)
    }
  }
  const metrics = setupMetrics()

  const clientConfig: Partial<PortalNetworkOpts> = {
    config,
    //@ts-ignore Because level doesn't know how to get along with itself
    db,
    metrics,
    supportedNetworks: networks,
    dataDir: args.dataDir,
    trustedBlockRoot: args.trustedBlockRoot,
    bootnodes,
    gossipCount: args.gossipCount,
    supportedVersions: args.supportedVersions,
  }
  return clientConfig
}

export const DEFAULT_OPTS = {
  bindAddress: '0.0.0.0',
  bootnodes: DEFAULT_BOOTNODES.mainnet,
}
