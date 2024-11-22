import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { SignableENR } from '@chainsafe/enr'
import { hexToBytes } from '@ethereumjs/util'
import { keys } from '@libp2p/crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { Level } from 'level'

import { NetworkId } from '../networks/types.js'

import { setupMetrics } from './metrics.js'

import type { NetworkConfig, PortalNetworkOpts } from '../client'

export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : any

export interface PortalClientOpts {
  pk?: string
  bootnode?: string
  bindAddress?: string
  bootnodeList?: string
  dataDir?: string
  networks: string
  storage: string
  trustedBlockRoot?: string
}

export const NetworkStrings: Record<string, NetworkId> = {
  history: NetworkId.HistoryNetwork,
  beacon: NetworkId.BeaconChainNetwork,
  state: NetworkId.StateNetwork,
}

export const cliConfig = async (args: PortalClientOpts) => {
  const cmd = 'hostname -I'
  const ip =
    args.bindAddress !== undefined
      ? args.bindAddress.split(':')[0]
      : execSync(cmd).toString().split(' ')[0].trim()
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
    const bootnodeData = readFileSync(args.bootnodeList, 'utf-8')
    const bootnodeList = bootnodeData.split('\n')
    for (const bootnode of bootnodeList) {
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
  }
  return clientConfig
}
