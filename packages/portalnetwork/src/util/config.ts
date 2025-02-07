import { SignableENR } from '@chainsafe/enr'
import { hexToBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { Level } from 'level'

import { NetworkId } from '../networks/types.js'

import { setupMetrics } from './metrics.js'

import type { NetworkConfig, PortalNetworkOpts } from '../client'
import { DEFAULT_BOOTNODES } from './bootnodes.js'

export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : any

export interface PortalClientOpts {
  pk?: string
  bootnode?: string
  bindAddress?: string
  bootnodeList?: string[]
  dataDir?: string
  networks: string
  storage: string
  trustedBlockRoot?: string
  gossipCount?: number
}

export const NetworkStrings: Record<string, NetworkId> = {
  history: NetworkId.HistoryNetwork,
  beacon: NetworkId.BeaconChainNetwork,
  state: NetworkId.StateNetwork,
}

let execSync: Function
let readFileSync: Function

if (typeof window === 'undefined') {
  import('child_process').then(childProcess => {
    execSync = childProcess.execSync
  })
  import('fs').then(fs => {
    readFileSync = fs.readFileSync
  })
} else {
  execSync = () => {
    throw new Error('execSync is not supported in the browser or Tauri environment')
  }
  readFileSync = () => {
    throw new Error('readFileSync is not supported in the browser or Tauri environment')
  }
}

export const cliConfig = async (args: PortalClientOpts) => {
  const ip =
    args.bindAddress !== undefined
      ? args.bindAddress.split(':')[0]
      : '0.0.0.0'
  const bindPort = args.bindAddress !== undefined ? args.bindAddress.split(':')[1] : 9000 // Default discv5 port
  let privateKey: AsyncReturnType<typeof keys.generateKeyPair>
  try {
    if (args.pk === undefined) {
      privateKey = await keys.generateKeyPair('secp256k1')
    } else {
      privateKey = keys.privateKeyFromRaw(hexToBytes(args.pk).slice(-32))
    }
  } catch (err: any) {
    throw new Error(`Error using pk: ${args.pk}\n${err.message}`)
  }
  const enr = SignableENR.createFromPrivateKey(privateKey)
  const initMa = multiaddr(`/ip4/${ip}/udp/${bindPort}`)
  enr.setLocationMultiaddr(initMa)

  let db
  if (args.dataDir !== undefined) {
    db = new Level<string, string>(args.dataDir)
  }
  const config = {
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
  const argsStorage = args.storage.split(',').map((x) => parseInt(x))
  for (const [i, network] of argsNetworks.entries()) {
    let networkdb
    if (args.dataDir !== undefined) {
      networkdb = {
        db: new Level<string, string>(args.dataDir + '/' + network, { createIfMissing: true }),
        path: args.dataDir + '/' + network,
      }
    }
    networks.push({
      networkId: NetworkStrings[network],
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
  }
  return clientConfig
}

export const DEFAULT_OPTS = {
  bindAddress: '0.0.0.0',
  bootnodes: DEFAULT_BOOTNODES.mainnet,
}