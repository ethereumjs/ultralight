import {
  HistoryNetworkContentType,
  NetworkId,
  addRLPSerializedBlock,
  fromHexString,
} from 'portalnetwork'

import { INTERNAL_ERROR } from '../error-code.js'
import { middleware, validators } from '../validators.js'

import type { Debugger } from 'debug'
import type {
  BeaconLightClientNetwork,
  HistoryNetwork,
  PortalNetwork,
  StateNetwork,
} from 'portalnetwork'

const methods = ['ultralight_store', 'ultralight_addBlockToHistory']

export class ultralight {
  private _client: PortalNetwork
  private _history?: HistoryNetwork
  private _state?: StateNetwork
  private _beacon?: BeaconLightClientNetwork
  private logger: Debugger

  constructor(client: PortalNetwork, logger: Debugger) {
    this._client = client
    this._history = this._client.network()[NetworkId.HistoryNetwork]
    this._state = this._client.network()[NetworkId.StateNetwork]
    this._beacon = this._client.network()[NetworkId.BeaconChainNetwork]
    this.logger = logger
    this.methods = middleware(this.methods.bind(this), 0, [])
    this.addContentToDB = middleware(this.addContentToDB.bind(this), 2, [
      [validators.hex],
      [validators.hex],
    ])
    this.addBlockToHistory = middleware(this.addBlockToHistory.bind(this), 2, [
      [validators.blockHash],
      [validators.hex],
    ])
    this.indexBlock = middleware(this.indexBlock.bind(this), 2, [
      [validators.hex],
      [validators.blockHash],
    ])
    this.setNetworkRadius = middleware(this.setNetworkRadius.bind(this), 2, [
      [validators.networkId],
      [validators.distance],
    ])
  }
  async methods() {
    return methods
  }
  async addBlockToHistory(params: [string, string]) {
    this.logger(`ultralight_addBlockToHistory request received`)

    const [blockHash, rlpHex] = params
    try {
      await addRLPSerializedBlock(rlpHex, blockHash, this._history!)
      this.logger(`Block ${blockHash} added to content DB`)
      return `Block ${blockHash} added to content DB`
    } catch (err: any) {
      this.logger(`Error trying to load block to DB. ${err.message.toString()}`)
      return `internal error`
    }
  }
  async addContentToDB(params: [string, string]) {
    const [contentKey, value] = params

    const type: number = parseInt(contentKey.slice(0, 4))
    this.logger(
      `ultralight_addContentToDB request received for ${HistoryNetworkContentType[type]} ${contentKey}`,
    )
    try {
      await this._history.store(contentKey, fromHexString(value))
      this.logger(`${type} value for ${contentKey} added to content DB`)
      return `${type} value for ${contentKey} added to content DB`
    } catch (err: any) {
      this.logger(`Error trying to load content to DB. ${err.message.toString()}`)
      return `Error trying to load content to DB. ${err.message.toString()}`
    }
  }

  async indexBlock(params: [string, string]) {
    const [blockNum, blockHash] = params
    try {
      this.logger(`Indexed block ${BigInt(blockNum)} / ${blockNum} to ${blockHash} `)
      await this._history!.indexBlockhash(BigInt(blockNum), blockHash)
      return `Added ${blockNum} to block index`
    } catch (err: any) {
      throw {
        code: INTERNAL_ERROR,
        message: err.message,
      }
    }
  }
  async setNetworkRadius(params: [NetworkId, string]) {
    const [networkId, radius] = params
    try {
      switch (networkId) {
        case NetworkId.HistoryNetwork: {
          this._history!.nodeRadius = 2n ** BigInt(parseInt(radius)) - 1n
          return '0x' + this._history!.nodeRadius.toString(16)
        }
        case NetworkId.StateNetwork: {
          this._state!.nodeRadius = 2n ** BigInt(parseInt(radius)) - 1n
          return '0x' + this._state!.nodeRadius.toString(16)
        }
        case NetworkId.BeaconChainNetwork: {
          this._beacon!.nodeRadius = 2n ** BigInt(parseInt(radius)) - 1n
          return '0x' + this._beacon!.nodeRadius.toString(16)
        }
        default: {
          throw {
            code: INTERNAL_ERROR,
            message: `Invalid network id ${networkId}`,
          }
        }
      }
    } catch (err: any) {
      return `Error setting radius ${err.message.toString()}`
    }
  }
}
