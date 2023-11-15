import {
  HistoryNetworkContentType,
  NetworkId,
  addRLPSerializedBlock,
  fromHexString,
} from 'portalnetwork'

import { INTERNAL_ERROR } from '../error-code.js'
import { middleware, validators } from '../validators.js'

import type { Debugger } from 'debug'
import type { HistoryNetwork, PortalNetwork } from 'portalnetwork'

const methods = ['ultralight_store', 'ultralight_addBlockToHistory']

export class ultralight {
  private _client: PortalNetwork
  private _history: HistoryNetwork
  private logger: Debugger

  constructor(client: PortalNetwork, logger: Debugger) {
    this._client = client
    this._history = this._client.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
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
  }
  async methods() {
    return methods
  }
  async addBlockToHistory(params: [string, string]) {
    this.logger(`ultralight_addBlockToHistory request received`)

    const [blockHash, rlpHex] = params
    const network = this._client.networks.get(NetworkId.HistoryNetwork) as never as HistoryNetwork
    try {
      await addRLPSerializedBlock(rlpHex, blockHash, network)
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
      await this._history.store(type, '0x' + contentKey.slice(4), fromHexString(value))
      this.logger(`${type} value for 0x${contentKey.slice(4)} added to content DB`)
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
      await this._history.indexBlockhash(BigInt(blockNum), blockHash)
      return `Added ${blockNum} to block index`
    } catch (err: any) {
      throw {
        code: INTERNAL_ERROR,
        message: err.message,
      }
    }
  }
}
