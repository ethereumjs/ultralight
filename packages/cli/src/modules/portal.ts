import { Debugger } from 'debug'
import {
  ENR,
  ProtocolId,
  addRLPSerializedBlock,
  HistoryNetworkContentTypes,
  fromHexString,
  shortId,
  HistoryNetworkContentKeyType,
  toHexString,
  HeaderAccumulatorType,
  HistoryProtocol,
  NodeLookup,
  PortalNetwork,
} from 'portalnetwork'
import { isValidId } from '../util.js'
import { middleware, validators } from '../validators.js'

export class portal {
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
    this.findNodes = middleware(this.findNodes.bind(this), 3, [
      [validators.dstId],
      [validators.array(validators.distance)],
      [validators.protocolId],
    ])
    this.headerAccumulatorRoot = middleware(this.headerAccumulatorRoot.bind(this), 0, [])
    this.history_findContent = middleware(this.history_findContent.bind(this), 2, [
      [validators.enr],
      [validators.hex],
    ])
    this.history_offer = middleware(this.history_offer.bind(this), 2, [
      [validators.dstId],
      [validators.array(validators.blockHash)],
      [validators.array(validators.history_contentType)],
    ])
    this.nodeEnr = middleware(this.nodeEnr.bind(this), 0, [])
    this.nodeLookup = middleware(this.nodeLookup.bind(this), 2, [
      [validators.protocolId],
      [validators.enr],
    ])
    this.ping = middleware(this.ping.bind(this), 2, [[validators.enr], [validators.protocolId]])
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
  async findNodes(params: [string, number[], string]) {
    const [dstId, distances, protocolId] = params
    if (!isValidId(dstId)) {
      return 'invalid node id'
    }
    const protocol = this._client.protocols.get(protocolId as ProtocolId)
    if (!protocol) {
      return `ProtocolID ${protocolId} not supported`
    }
    this.logger(`findNodes request received with these distances ${distances.toString()}`)
    const res = await protocol.sendFindNodes(dstId, distances)
    this.logger(`response received to findNodes ${res?.toString()}`)
    return `${res?.total ?? 0} nodes returned`
  }
  async ping(params: [string, string]) {
    const [enr, protocolId] = params
    const protocol = this._client.protocols.get(protocolId as ProtocolId)
    if (!protocol) {
      return `ProtocolID ${protocolId} not supported`
    }
    const encodedENR = ENR.decodeTxt(enr)
    this.logger(
      `PING request received on ${protocol.protocolName} for ${shortId(encodedENR.nodeId)}`
    )
    const pong = await protocol.sendPing(enr)
    if (pong) {
      return `PING/PONG successful with ${encodedENR.nodeId}`
    } else {
      return `PING/PONG with ${encodedENR.nodeId} was unsuccessful`
    }
  }
  async history_findContent(params: [string, Uint8Array]) {
    const [enr, contentKey] = params
    const protocol = this._client.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
    if (!protocol) {
      return `History Protocol not supported`
    }
    const res = await protocol.sendFindContent(enr, contentKey)
    return res
  }
  async history_offer(params: [string, string[], number[]]) {
    const [dstId, blockHashes, contentTypes] = params
    contentTypes.forEach((contentType) => {
      try {
        isValidId(dstId)
        contentType > 0
        contentType < 2
      } catch {
        throw new Error('invalid parameters')
      }
    })
    const contentKeys = blockHashes.map((blockHash, idx) => {
      return HistoryNetworkContentKeyType.serialize({
        selector: contentTypes[idx],
        value: {
          blockHash: fromHexString(blockHash),
        },
      })
    })
    const protocol = this._client.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
    const res = await protocol.sendOffer(dstId, contentKeys)
    return res
  }
  async headerAccumulatorRoot() {
    this.logger(`Received request for current header accumulator root hash`)
    const protocol = this._client.protocols.get(
      ProtocolId.HistoryNetwork
    ) as never as HistoryProtocol
    return toHexString(HeaderAccumulatorType.hashTreeRoot(protocol.accumulator.masterAccumulator()))
  }
  async nodeLookup(params: [ProtocolId, string]) {
    const [protocolId, nodeSought] = params
    const enr = ENR.decodeTxt(nodeSought)
    const id = enr.nodeId
    const protocol = this._client.protocols.get(protocolId)
    const lookup = new NodeLookup(protocol!, id)
    const look = await lookup.startLookup()
    console.log(look)
    return `Node Lookup Successful for ${shortId(nodeSought)}`
  }
}
