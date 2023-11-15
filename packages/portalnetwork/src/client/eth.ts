import { fromHexString } from '@chainsafe/ssz'
import { EVM } from '@ethereumjs/evm'
import { Address, TypeOutput, toType } from '@ethereumjs/util'

import { NetworkId, UltralightStateManager } from '../networks/index.js'

import type { PortalNetwork } from './client.js'
import type { RpcTx } from './types.js'
import type { BeaconLightClientNetwork, HistoryNetwork, StateNetwork } from '../networks/index.js'

export class ETH {
  history?: HistoryNetwork
  state?: StateNetwork
  beacon?: BeaconLightClientNetwork
  activeNetworks: NetworkId[]

  constructor(portal: PortalNetwork) {
    this.activeNetworks = Object.keys(portal.network()) as NetworkId[]
    this.history = portal.network()['0x500b']
    this.state = portal.network()['0x500a']
    this.beacon = portal.network()['0x501a']
  }

  ethGetBalance = async (address: string, blockNumber: bigint): Promise<bigint | undefined> => {
    this.networkCheck([NetworkId.StateNetwork, NetworkId.HistoryNetwork])
    const stateRoot = await this.history!.getStateRoot(blockNumber)
    if (!stateRoot) {
      throw new Error(`Unable to find StateRoot for block ${blockNumber}`)
    }
    const res = await this.state!.getAccount(address, stateRoot)
    return res?.balance
  }

  /**
   * Implements functionality needed for making `eth_call` RPC calls over Portal Network data
   * @param tx an `RpcTx` object matching the `eth_call` input spec
   * @param blockNumber a block number as a `bigint`
   * @returns An execution result as defined by the `eth_call` spec
   */
  ethCall = async (tx: RpcTx, blockNumber: bigint): Promise<any> => {
    this.networkCheck([NetworkId.HistoryNetwork, NetworkId.StateNetwork])
    const stateRoot = await this.history!.getStateRoot(blockNumber)
    if (!stateRoot) {
      throw new Error(`Unable to find StateRoot for block ${blockNumber}`)
    }
    const usm = new UltralightStateManager(this.state!)
    // @ts-expect-error There's some weird typing error buried in the state manager interface with the Account type.
    // Just ignoring for now
    const evm = new EVM({ stateManager: usm })
    await evm.stateManager.setStateRoot(fromHexString(stateRoot))
    const { from, to, gas: gasLimit, gasPrice, value, data } = tx

    const runCallOpts = {
      caller: from !== undefined ? Address.fromString(from) : undefined,
      to: to !== undefined ? Address.fromString(to) : undefined,
      gasLimit: toType(gasLimit, TypeOutput.BigInt),
      gasPrice: toType(gasPrice, TypeOutput.BigInt),
      value: toType(value, TypeOutput.BigInt),
      data: data !== undefined ? fromHexString(data) : undefined,
    }
    const res = (await evm.runCall(runCallOpts)).execResult.returnValue
    return res
  }

  private networkCheck = (networks: NetworkId[]) => {
    for (const network of networks) {
      if (this.activeNetworks.findIndex((el) => el === network) === -1)
        throw new Error(
          `${
            Object.entries(NetworkId).find((el) => el[1] === network)?.[0] ??
            'Unsupported network ' + network
          } required for this call`,
        )
    }
  }
}
