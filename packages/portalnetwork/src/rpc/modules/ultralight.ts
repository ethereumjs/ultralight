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

export class ultralight {
  private _client: PortalNetwork
  private logger: Debugger

  constructor(client: PortalNetwork, logger: Debugger) {
    this._client = client
    this.logger = logger
    this.addBlockHeaderToHistory = middleware(this.addBlockHeaderToHistory.bind(this), 2, [
      [validators.blockHash],
      [validators.hex],
    ])
    this.addBlockToHistory = middleware(this.addBlockToHistory.bind(this), 2, [
      [validators.blockHash],
      [validators.hex],
    ])
    this.addBootNode = middleware(this.addBootNode.bind(this), 2, [
      [validators.enr],
      [validators.protocolId],
    ])
    this.nodeEnr = middleware(this.nodeEnr.bind(this), 0, [])
  }
  async addBootNode(params: [string, string]) {
    const [enr, protocolId] = params
    const encodedENR = ENR.decodeTxt(enr)
    this.logger(
      `portal_addBootNode request received for NodeID: ${encodedENR.nodeId.slice(0, 15)}...`
    )
    const protocol = this._client.protocols.get(protocolId as ProtocolId)
    if (protocol) {
      await protocol.addBootNode(enr)
      return `Bootnode added for ${encodedENR.nodeId.slice(0, 15)}...`
    } else {
      return `ProtocolID ${protocolId} not supported`
    }
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
  async nodeEnr() {
    this.logger(`nodeEnr request received`)
    try {
      const enr = this._client.discv5.enr.encodeTxt()
      return enr
    } catch (err) {
      return 'Unable to generate ENR'
    }
  }
}
