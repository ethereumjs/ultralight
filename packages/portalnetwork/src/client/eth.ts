import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Block, BlockHeader } from '@ethereumjs/block'
import { EVM } from '@ethereumjs/evm'
import { Address, TypeOutput, bytesToHex, intToHex, toType } from '@ethereumjs/util'
import { ssz } from '@lodestar/types'

import {
  BeaconLightClientNetworkContentType,
  ContentLookup,
  EpochAccumulator,
  HistoryNetworkContentType,
  NetworkId,
  UltralightStateManager,
  epochRootByBlocknumber,
  getContentKey,
  reassembleBlock,
} from '../networks/index.js'

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

  /**
   * Portal Network implementation of JSON-RPC `eth_getBlockByNumber`.
   * @param blockNumber number of block sought
   * @param includeTransactions whether to include transactions with the block
   * @returns returns an @ethereumjs/block formatted `Block` object
   */
  public getBlockByNumber = async (
    blockNumber: number | bigint | 'latest' | 'final',
    includeTransactions: boolean,
  ): Promise<Block | undefined> => {
    this.networkCheck([NetworkId.HistoryNetwork])
    let blockHash
    if (blockNumber === 'latest' || blockNumber === 'final') {
      this.networkCheck([NetworkId.BeaconLightClientNetwork])
      let clHeader, elHeaderData
      if (blockNumber === 'latest') {
        clHeader = this.beacon!.lightClient?.getHead()
        if (clHeader !== undefined) {
          const encodedOptimisticUpdate = await this.beacon!.retrieve(
            intToHex(BeaconLightClientNetworkContentType.LightClientOptimisticUpdate),
          )
          if (encodedOptimisticUpdate === undefined)
            // This shouldn't happen since we've already checked that the light client is running above so not being defined
            // means something went wrong trying to store an optimistic update
            throw new Error('optimstic update not stored locally')
          // `latest` cannot mean a pre-capella block at this point so can safely assume we have an execution header in the update
          const update = fromHexString(encodedOptimisticUpdate!)
          elHeaderData = ssz.capella.LightClientOptimisticUpdate.deserialize(update.slice(4))
            .attestedHeader.execution
        } else {
          clHeader = this.beacon!.lightClient?.getFinalized()
          const encodedFinalityUpdate = await this.beacon!.retrieve(
            intToHex(BeaconLightClientNetworkContentType.LightClientFinalityUpdate),
          )
          if (encodedFinalityUpdate === undefined)
            // This shouldn't happen since we've already checked that the light client is running above so not being defined
            // means something went wrong trying to store a finality update
            throw new Error('finality update not stored locally')
          const update = fromHexString(encodedFinalityUpdate)
          elHeaderData = ssz.capella.LightClientFinalityUpdate.deserialize(update.slice(4))
            .finalizedHeader.execution
        }

        const header = BlockHeader.fromHeaderData(elHeaderData, { setHardfork: true })
        if (!includeTransactions) {
          return Block.fromBlockData({ header })
        } else {
          // We do a direct recursive content lookup here instead of getBlockByHash so we don't search the network for a header we already have
          const bodyLookup = new ContentLookup(
            this.history!,
            fromHexString(
              getContentKey(HistoryNetworkContentType.BlockBody, elHeaderData.blockHash),
            ),
          )
          const res = await bodyLookup.startLookup()
          if (res !== undefined && 'content' in res) {
            const block = reassembleBlock(header.serialize(), res.content)
            return block
          } else {
            // TODO: Decide if we should return an error here since we didn't find the block body and can't return it
            return Block.fromBlockData({ header })
          }
        }
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
