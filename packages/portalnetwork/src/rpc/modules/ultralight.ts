import { Debugger } from 'debug'
import {
  ENR,
  ProtocolId,
  addRLPSerializedBlock,
  HistoryNetworkContentTypes,
  fromHexString,
  HistoryProtocol,
  PortalNetwork,
} from '../../index.js'
import { middleware, validators } from '../validators.js'

const methods = ['ultralight_addBlockHeaderToHistory', 'ultralight_addBlockToHistory']

export class ultralight {
  private _client: PortalNetwork
  private logger: Debugger

  constructor(client: PortalNetwork, logger: Debugger) {
    this._client = client
    this.logger = logger
    this.methods = middleware(this.methods.bind(this), 0, [])
    this.addBlockHeaderToHistory = middleware(this.addBlockHeaderToHistory.bind(this), 2, [
      [validators.blockHash],
      [validators.hex],
    ])
    this.addBlockToHistory = middleware(this.addBlockToHistory.bind(this), 2, [
      [validators.blockHash],
      [validators.hex],
    ])
  }
  async methods() {
    return methods
  }
  async addBlockToHistory(params: [string, string]) {
    const [blockHash, rlpHex] = params
    const protocol = this._client.protocols.get(
      ProtocolId.HistoryNetwork
    ) as never as HistoryProtocol
    try {
      addRLPSerializedBlock(rlpHex, blockHash, protocol)
      return `blockheader for ${blockHash} added to content DB`
    } catch (err: any) {
      this.logger(`Error trying to load block to DB. ${err.message.toString()}`)
      return `internal error`
    }
  }
  async addBlockHeaderToHistory(params: [string, string]) {
    const [blockHash, rlpHex] = params
    try {
      const protocol = this._client.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
      protocol.addContentToHistory(
        HistoryNetworkContentTypes.BlockHeader,
        blockHash,
        fromHexString(rlpHex)
      )
      return `blockheader for ${blockHash} added to content DB`
    } catch (err: any) {
      this.logger(`Error trying to load block to DB. ${err.message.toString()}`)
      return `Error trying to load block to DB. ${err.message.toString()}`
    }
  }
}
