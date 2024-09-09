import { fromHexString, toHexString } from '@chainsafe/ssz'
import { EVM } from '@ethereumjs/evm'
import { Address, TypeOutput, bytesToHex, hexToBytes, toType } from '@ethereumjs/util'

import {
  BlockHeaderWithProof,
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
import type {
  BeaconLightClientNetwork,
  ContentLookupResponse,
  HistoryNetwork,
  StateNetwork,
} from '../networks/index.js'
import type { Block } from '@ethereumjs/block'
import type { capella } from '@lodestar/types'
import type { Debugger } from 'debug'

export class ETH {
  history?: HistoryNetwork
  state?: StateNetwork
  beacon?: BeaconLightClientNetwork
  activeNetworks: NetworkId[]
  logger: Debugger
  constructor(portal: PortalNetwork) {
    this.activeNetworks = Object.keys(portal.network()) as NetworkId[]
    this.history = portal.network()['0x500b']
    this.state = portal.network()['0x500a']
    this.beacon = portal.network()['0x500c']
    this.logger = portal.logger.extend(`ETH_GETBLOCKBYNUMBER`)
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
    return undefined
    // const res = await this.state!.getAccount(address, stateRoot)
    // return res?.balance
  }

  public getBlockByHash = async (
    blockHash: string,
    includeTransactions: boolean,
  ): Promise<Block | undefined> => {
    let lookupResponse: ContentLookupResponse
    let header: any
    let body: any
    let block
    try {
      this.networkCheck([NetworkId.HistoryNetwork])
      this.history!.logger.extend('getBlockByHash')(`Looking for ${blockHash} locally`)
      // Try to find block locally
      const block = await this.history!.getBlockFromDB(
        { blockHash: fromHexString(blockHash) },
        includeTransactions,
      )
      return block
    } catch {
      /** NOOP */
    }
    const headerContentKey = hexToBytes(
      getContentKey(HistoryNetworkContentType.BlockHeader, hexToBytes(blockHash)),
    )
    const bodyContentKey = includeTransactions
      ? hexToBytes(getContentKey(HistoryNetworkContentType.BlockBody, hexToBytes(blockHash)))
      : undefined
    try {
      let lookup = new ContentLookup(this.history!, headerContentKey)
      lookupResponse = await lookup.startLookup()
      this.history!.logger.extend('getBlockByHash')(`Looking for ${blockHash} on the network`)
      this.history!.logger.extend('getBlockByHash')(lookupResponse)
      if (!lookupResponse || !('content' in lookupResponse)) {
        return undefined
      } else {
        header = lookupResponse.content
        header = BlockHeaderWithProof.deserialize(header as Uint8Array).header
      }
      if (!includeTransactions) {
        block = reassembleBlock(header, undefined)
        return block
      } else {
        lookup = new ContentLookup(this.history!, bodyContentKey!)
        lookupResponse = await lookup.startLookup()
        if (!lookupResponse || !('content' in lookupResponse)) {
          block = reassembleBlock(header)
        } else {
          body = lookupResponse.content
          block = reassembleBlock(header, body)
        }
      }
    } catch {
      /** NOOP */
    }
    return block
  }

  getBlockByTag = async (
    blockTag: 'latest' | 'finalized',
    includeTransactions: boolean,
  ): Promise<Block | undefined> => {
    // Requires beacon light client to be running to get `latest` or `finalized` blocks
    this.networkCheck([NetworkId.BeaconChainNetwork])
    let clHeader
    switch (blockTag) {
      case 'latest': {
        clHeader = this.beacon!.lightClient?.getHead() as capella.LightClientHeader
        if (clHeader === undefined) throw new Error('light client is not tracking head')
        return this.getBlockByHash(toHexString(clHeader.execution.blockHash), includeTransactions)
      }
      case 'finalized': {
        clHeader = this.beacon!.lightClient?.getFinalized() as capella.LightClientHeader
        if (clHeader === undefined) throw new Error('no finalized head available')
        return this.getBlockByHash(toHexString(clHeader.execution.blockHash), includeTransactions)
      }
    }
  }

  /**
   * Implements logic required for `eth_getBlockByNumber` JSON-RPC call
   * @param blockNumber number of block sought, `latest`, `finalized`
   * @param includeTransactions whether to include transactions with the block
   * @returns returns an @ethereumjs/block formatted `Block` object
   */
  public getBlockByNumber = async (
    blockNumber: number | bigint | 'latest' | 'finalized',
    includeTransactions: boolean,
  ): Promise<Block | undefined> => {
    this.networkCheck([NetworkId.HistoryNetwork])
    if (blockNumber === 'latest' || blockNumber === 'finalized') {
      return this.getBlockByTag(blockNumber, includeTransactions)
      }
    }

    blockHash = (await this.history!.blockIndex()).get('0x' + blockNumber.toString(16))
    if (blockHash === undefined) {
      this.logger(`Block ${blockNumber} not in local index`)
      const epochRootHash = epochRootByBlocknumber(BigInt(blockNumber))
      if (!epochRootHash) {
        // Requested block number is greater than merge block
        // TODO: Build logic for retrieving post-merge blocks by number
        this.logger(`Block ${blockNumber} is post-merge block.  Cannot retrieve by number`)
        return undefined
      }
      this.logger(
        `Retrieving Epoch Accumulator ${bytesToHex(epochRootHash)} that contains blockhash for block ${blockNumber}`,
      )
      const lookupKey = getContentKey(HistoryNetworkContentType.EpochAccumulator, epochRootHash)
      const epoch_lookup = new ContentLookup(this.history!, fromHexString(lookupKey))
      const result = await epoch_lookup.startLookup()

      if (result && 'content' in result) {
        this.logger(`Found EpochAccumulator with header record for block ${blockNumber}`)
        const epoch = EpochAccumulator.deserialize(result.content)
        blockHash = toHexString(epoch[Number(blockNumber) % 8192].blockHash)
        this.logger(`Block ${blockNumber} corresponds to Blockhash ${blockHash}`)
      }
    }
    if (blockHash === undefined) {
      // This should never happen
      return undefined
    }
    const block = await this.getBlockByHash(blockHash, includeTransactions)
    if (block?.header.number === BigInt(blockNumber)) {
      return block
    } else {
      this.logger(`Block ${blockNumber} not found`)
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
