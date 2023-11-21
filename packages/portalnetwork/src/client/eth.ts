import { fromHexString, toHexString } from '@chainsafe/ssz'
import { EVM } from '@ethereumjs/evm'
import { Address, TypeOutput, bytesToHex, toType } from '@ethereumjs/util'

import {
  ContentLookup,
  EpochAccumulator,
  HistoryNetworkContentType,
  NetworkId,
  UltralightStateManager,
  epochRootByBlocknumber,
  getContentKey,
} from '../networks/index.js'

import type { PortalNetwork } from './client.js'
import type { RpcTx } from './types.js'
import type { BeaconLightClientNetwork, HistoryNetwork, StateNetwork } from '../networks/index.js'
import type { Block } from '@ethereumjs/block'
import type { capella } from '@lodestar/types'

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

  /**
   * Implements logic required for `eth_getBalance` JSON-RPC call
   * @param address address to be looked up
   * @param blockNumber block number from which balance should be returned
   * @returns returns the ETH balance of an address at the specified block number or undefined if not available
   */
  ethGetBalance = async (address: string, blockNumber: bigint): Promise<bigint | undefined> => {
    this.networkCheck([NetworkId.StateNetwork, NetworkId.HistoryNetwork])
    const stateRoot = await this.history!.getStateRoot(blockNumber)
    if (!stateRoot) {
      throw new Error(`Unable to find StateRoot for block ${blockNumber}`)
    }
    const res = await this.state!.getAccount(address, stateRoot)
    return res?.balance
  }

  /**type ssz etBlockByNumber`.
   * @param blockNumber number of block sought
   * @param includeTransactions whether to include transactions with the block
   * @returns returns an @ethereumjs/block formatted `Block` object
   */
  public getBlockByNumber = async (
    blockNumber: number | bigint | 'latest' | 'finalized',
    includeTransactions: boolean,
  ): Promise<Block | undefined> => {
    this.networkCheck([NetworkId.HistoryNetwork])
    let blockHash
    if (blockNumber === 'latest' || blockNumber === 'finalized') {
      this.networkCheck([NetworkId.BeaconLightClientNetwork])
      let clHeader
      if (blockNumber === 'latest') {
        clHeader = this.beacon!.lightClient?.getHead() as capella.LightClientHeader
        if (clHeader === undefined) throw new Error('light client is not tracking head')
        return this.history?.ETH.getBlockByHash(
          toHexString(clHeader.execution.blockHash),
          includeTransactions,
        )
      } else if (blockNumber === 'finalized') {
        clHeader = this.beacon!.lightClient?.getFinalized() as capella.LightClientHeader
        if (clHeader === undefined) throw new Error('no finalized head available')
        return this.history?.ETH.getBlockByHash(
          toHexString(clHeader.execution.blockHash),
          includeTransactions,
        )
      }
    }

    blockHash = (await this.history!.blockIndex()).get('0x' + blockNumber.toString(16))
    if (blockHash === undefined) {
      const epochRootHash = epochRootByBlocknumber(BigInt(blockNumber))
      if (!epochRootHash) {
        return undefined
      }
      const lookupKey = getContentKey(HistoryNetworkContentType.EpochAccumulator, epochRootHash)
      const epoch_lookup = new ContentLookup(this.history!, fromHexString(lookupKey))
      const result = await epoch_lookup.startLookup()

      if (result && 'content' in result) {
        this.history!.logger.extend(`ETH_GETBLOCKBYNUMBER`)(
          `Found EpochAccumulator with header record for block ${blockNumber}`,
        )
        const epoch = EpochAccumulator.deserialize(result.content)
        blockHash = toHexString(epoch[Number(blockNumber) % 8192].blockHash)
      }
    }
    if (blockHash === undefined) {
      return undefined
    }
    const block = await this.history!.ETH.getBlockByHash(blockHash, includeTransactions)
    if (block?.header.number === BigInt(blockNumber)) {
      return block
    } else {
      this.history!.logger(`Block ${blockNumber} not found`)
      return undefined
    }
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
    //@ts-ignore there's something wrong with the state manager interface
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
    return bytesToHex(res)
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
