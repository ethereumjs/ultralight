import { EVM } from '@ethereumjs/evm'
import { Address, TypeOutput, bytesToHex, toType, hexToBytes } from '@ethereumjs/util'
import { keccak256 } from 'ethereum-cryptography/keccak.js'

import {
  BlockHeaderByNumberKey,
  BlockHeaderWithProof,
  ContentLookup,
  HistoryNetworkContentType,
  NetworkId,
  UltralightStateManager,
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
    this.logger = portal.logger.extend(`ETH`)
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
    blockHash: Uint8Array,
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
      const block = await this.history!.getBlockFromDB({ blockHash }, includeTransactions)
      return block
    } catch {
      /** NOOP */
    }
    const headerContentKey = getContentKey(HistoryNetworkContentType.BlockHeader, blockHash)
    const bodyContentKey = includeTransactions
      ? getContentKey(HistoryNetworkContentType.BlockBody, blockHash)
      : undefined
    try {
      let lookup = new ContentLookup(this.history!, headerContentKey)
      lookupResponse = await lookup.startLookup()
      this.logger.extend('getBlockByHash')(`Looking for ${blockHash} on the network`)
      this.logger.extend('getBlockByHash')(lookupResponse)
      if (!lookupResponse || !('content' in lookupResponse)) {
        // Header not found by hash, try to find by number if known
        const blockNumber = this.history!.blockHashToNumber(blockHash)
        if (blockNumber !== undefined) {
          const block = await this.getBlockByNumber(blockNumber, includeTransactions)
          return block
        }
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
        return this.getBlockByHash(clHeader.execution.blockHash, includeTransactions)
      }
      case 'finalized': {
        clHeader = this.beacon!.lightClient?.getFinalized() as capella.LightClientHeader
        if (clHeader === undefined) throw new Error('no finalized head available')
        return this.getBlockByHash(clHeader.execution.blockHash, includeTransactions)
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

    // Try to find block locally
    try {
      const block = await this.history!.getBlockFromDB(
        { blockNumber: BigInt(blockNumber) },
        includeTransactions,
      )
      return block
    } catch {
      this.logger(`Block ${blockNumber} not found locally - looking on the network`)
    }

    // Try to find header on the network via block number
    let header: Uint8Array | undefined

    const headerNumberContentKey = BlockHeaderByNumberKey(BigInt(blockNumber))
    const lookup = new ContentLookup(this.history!, headerNumberContentKey)
    const lookupResponse = await lookup.startLookup()

    if (lookupResponse && 'content' in lookupResponse) {
      // Header found by number.  Now get the body via hash
      header = BlockHeaderWithProof.deserialize(lookupResponse.content).header
      const hash = keccak256(header)
      const bodyContentKey = getContentKey(HistoryNetworkContentType.BlockBody, hash)
      const bodyLookup = new ContentLookup(this.history!, bodyContentKey)
      const bodyLookupResponse = await bodyLookup.startLookup()
      if (bodyLookupResponse && 'content' in bodyLookupResponse) {
        // Body found by hash.  Reassemble block
        const body = bodyLookupResponse.content
        return reassembleBlock(header, body)
      } else {
        // Body not found by hash.  Reassemble block without body
        return reassembleBlock(header)
      }
    } else {
      // Header not found by number.  If block hash is known, search for header by hash
      const blockHash = this.history!.blockNumberToHash(BigInt(blockNumber))
      if (blockHash !== undefined) {
        return this.getBlockByHash(blockHash, includeTransactions)
      }
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
    await evm.stateManager.setStateRoot(hexToBytes(stateRoot))
    const { from, to, gas: gasLimit, gasPrice, value, data } = tx

    const runCallOpts = {
      caller: from !== undefined ? Address.fromString(from) : undefined,
      to: to !== undefined ? Address.fromString(to) : undefined,
      gasLimit: toType(gasLimit, TypeOutput.BigInt),
      gasPrice: toType(gasPrice, TypeOutput.BigInt),
      value: toType(value, TypeOutput.BigInt),
      data: data !== undefined ? hexToBytes(data) : undefined,
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
