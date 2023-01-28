import { EntryStatus } from '@chainsafe/discv5'
import { Debugger } from 'debug'
import {
  ENR,
  ProtocolId,
  fromHexString,
  shortId,
  toHexString,
  HistoryProtocol,
  PortalNetwork,
  HistoryNetworkContentTypes,
  ContentLookup,
  NodeLookup,
  PingPongCustomDataType,
  PortalWireMessageType,
  MessageCodes,
} from '../../index.js'
import { GetEnrResult } from '../schema/types.js'
import { isValidId } from '../util.js'
import { middleware, validators } from '../validators.js'

const methods = [
  'portal_historyRoutingTableInfo',
  'portal_historyAddEnr',
  'portal_historyGetEnr',
  'portal_historyDeleteEnr',
  'portal_historyLookupEnr',
  'portal_historySendPing', // (ENR, DataRadius) => SendPingResult(requestId)
  'portal_historySendPong',
  // 'portal_historySendFindNodes',
  // 'portal_historySendFindContent',
  // 'portal_historySendContent',
  // 'portal_historySendOffer',
  // 'portal_historySendAccept',
  'portal_historyPing', // (ENR, DataRadius) => PingResult (PONG MESSAGE)
  'portal_historyFindNodes',
  'portal_historyFindContent',
  'portal_historyOffer',
  'portal_historyRecursiveFindNodes',
  'portal_historyRecursiveFindContent',
  'portal_historyStore',
  'portal_historyLocalContent',
  'portal_historyGossip',

  // not included in portal-network-specs
  'portal_historyAddEnrs',
  'portal_historyAddBootNode',
  'portal_historyNodeInfo',
]

export class portal {
  private _client: PortalNetwork
  private _history: HistoryProtocol
  private logger: Debugger

  constructor(client: PortalNetwork, logger: Debugger) {
    this._client = client
    this._history = this._client.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
    this.logger = logger
    this.methods = middleware(this.methods.bind(this), 0, [])
    this.historyNodeInfo = middleware(this.historyNodeInfo.bind(this), 0, [])
    this.historyRoutingTableInfo = middleware(this.historyRoutingTableInfo.bind(this), 0, [])
    this.historyLookupEnr = middleware(this.historyLookupEnr.bind(this), 1, [[validators.enr]])
    this.historyAddBootNode = middleware(this.historyAddBootNode.bind(this), 1, [[validators.enr]])
    this.historyAddEnr = middleware(this.historyAddEnr.bind(this), 1, [[validators.enr]])
    this.historyGetEnr = middleware(this.historyGetEnr.bind(this), 1, [[validators.dstId]])
    this.historyDeleteEnr = middleware(this.historyDeleteEnr.bind(this), 1, [[validators.dstId]])
    this.historyAddEnrs = middleware(this.historyAddEnrs.bind(this), 1, [
      [validators.array(validators.enr)],
    ])
    this.historyPing = middleware(this.historyPing.bind(this), 2, [
      [validators.enr],
      [validators.hex],
    ])
    this.historySendPing = middleware(this.historySendPing.bind(this), 2, [
      [validators.enr],
      [validators.hex],
    ])
    this.historySendPong = middleware(this.historySendPong.bind(this), 2, [
      [validators.enr],
      [validators.hex],
      [validators.hex],
    ])
    this.historyFindNodes = middleware(this.historyFindNodes.bind(this), 2, [
      [validators.dstId],
      [validators.array(validators.distance)],
    ])
    this.historyRecursiveFindNodes = middleware(this.historyRecursiveFindNodes.bind(this), 1, [
      [validators.dstId],
    ])
    this.historyLocalContent = middleware(this.historyLocalContent.bind(this), 1, [
      [validators.hex],
    ])
    this.historyStore = middleware(this.historyStore.bind(this), 2, [
      [validators.contentKey],
      [validators.hex],
    ])
    this.historyFindContent = middleware(this.historyFindContent.bind(this), 2, [
      [validators.dstId],
      [validators.hex],
    ])
    this.historyRecursiveFindContent = middleware(this.historyRecursiveFindContent.bind(this), 1, [
      [validators.contentKey],
    ])
    this.historyOffer = middleware(this.historyOffer.bind(this), 2, [
      [validators.dstId],
      [validators.array(validators.hex)],
    ])
    this.historyGossip = middleware(this.historyGossip.bind(this), 2, [
      [validators.contentKey],
      [validators.hex],
    ])
  }
  async methods() {
    return methods
  }
  async historyNodeInfo() {
    this.logger(`historyNodeInfo request received`)
    try {
      const enr = this._client.discv5.enr.encodeTxt()
      const nodeId = this._client.discv5.enr.nodeId
      return { enr, nodeId }
    } catch (err) {
      return 'Unable to generate ENR'
    }
  }
  async historyAddBootNode(params: [string]): Promise<boolean> {
    const [enr] = params
    this.logger(`portal_historyAddEnrs request received for ${enr.slice(0, 10)}...`)
    try {
      await this._history.addBootNode(enr)
    } catch {
      return false
    }
    return true
  }
  async historyAddEnrs(params: [string[]]): Promise<boolean> {
    const [enrs] = params
    const encodedENRs = enrs.map((enr) => ENR.decodeTxt(enr))
    const shortEnrs = Object.fromEntries(
      encodedENRs.map((enr, idx) => [idx, enr.nodeId.slice(0, 15) + '...'])
    )
    this.logger(`portal_historyAddEnrs request received for ${shortEnrs}`)
    const added: number[] = []

    try {
      for (const [idx, enr] of encodedENRs.entries()) {
        await this._history.addBootNode(enr.encodeTxt())
        added.push(idx)
      }
    } catch {
      return false
    }
    return true
  }
  async historyGetEnr(params: [string]): Promise<GetEnrResult> {
    const [nodeId] = params
    this.logger(`portal_historyGetEnr request received for ${nodeId.slice(0, 10)}...`)
    const enr = this._history.routingTable.getValue(nodeId)
    if (enr) {
      return enr.encodeTxt()
    }
    return ''
  }

  async historyAddEnr(params: [string]): Promise<boolean> {
    const [enr] = params
    const encodedENR = ENR.decodeTxt(enr)
    const shortEnr = encodedENR.nodeId.slice(0, 15) + '...'
    this.logger(`portal_historyAddEnr request received for ${shortEnr}`)
    try {
      if (this._history.routingTable.getValue(encodedENR.nodeId)) {
        return true
      }
      this._history.routingTable.insertOrUpdate(encodedENR, EntryStatus.Disconnected)
      return true
    } catch {
      return false
    }
  }
  async historyDeleteEnr(params: [string]): Promise<boolean> {
    this.logger(`portal_historyDeleteEnr request received.`)
    const [nodeId] = params
    this._history.routingTable.removeById(nodeId)
    return true
  }
  async historyRoutingTableInfo(params: []): Promise<any> {
    this.logger(`portal_historyRoutingTableInfo request received.`)
    let localNodeId = ''
    let buckets: string[][] = []
    const table = this._history.routingTable
    try {
      localNodeId = table.localId
      buckets = table.buckets
        .map((bucket) => bucket.values().map((value) => value.nodeId))
        .reverse()
    } catch (err) {
      localNodeId = (err as any).message
    }
    return {
      localNodeId: localNodeId,
      buckets: buckets,
    }
  }
  async historyLookupEnr(params: [string]) {
    const [nodeId] = params
    this.logger(`Looking up ENR for NodeId: ${shortId(nodeId)}`)
    const enr = this._history.routingTable.getValue(nodeId)?.encodeTxt()
    this.logger(`Found: ${enr}`)
    return enr
  }
  async historyPing(params: [string, string]) {
    const [enr, dataRadius] = params
    const encodedENR = ENR.decodeTxt(enr)
    this.logger(`PING request received on HistoryNetwork for ${shortId(encodedENR.nodeId)}`)
    const pong = await this._history.sendPing(encodedENR)
    if (pong) {
      this.logger(`PING/PONG successful with ${encodedENR.nodeId}`)
    } else {
      this.logger(`PING/PONG with ${encodedENR.nodeId} was unsuccessful`)
    }
    return (
      pong && {
        enrSeq: '0x' + pong.enrSeq.toString(16),
        dataRadius: toHexString(pong.customPayload),
      }
    )
  }
  async historySendPing(params: [string, string]) {
    this.logger(`portal_historySendPing`)
    const pong = await this.historyPing(params)
    return pong && pong.enrSeq
  }
  async historySendPong(params: [string, string, string]) {
    const [_enr, requestId, dataRadius] = params
    const enr = ENR.decodeTxt(_enr)
    this.logger(`PONG request received on HistoryNetwork for ${shortId(enr.nodeId)}`)
    const payload = {
      enrSeq: this._client.discv5.enr.seq,
      customPayload: PingPongCustomDataType.serialize({ radius: BigInt(dataRadius) }),
    }
    const pongMsg = PortalWireMessageType.serialize({
      selector: MessageCodes.PONG,
      value: payload,
    })
    this.logger.extend('PONG')(`Sent to ${shortId(enr.nodeId)}`)
    try {
      await this._client.sendPortalNetworkResponse(
        { nodeId: enr.nodeId, socketAddr: enr.getLocationMultiaddr('udp')! },
        BigInt(requestId),
        Buffer.from(pongMsg)
      )
    } catch {
      return false
    }
    return true
  }
  async historyFindNodes(params: [string, number[]]) {
    const [dstId, distances] = params
    this.logger(`findNodes request received with these distances ${distances.toString()}`)
    if (!isValidId(dstId)) {
      return 'invalid node id'
    }
    const res = await this._history.sendFindNodes(dstId, distances)
    this.logger(`findNodes request returned ${res?.total} enrs`)
    return res?.enrs.map((v) => toHexString(v))
  }
  async historyRecursiveFindNodes(params: [string]) {
    const [dstId] = params
    this.logger(`historyRecursiveFindNodes request received for ${dstId}`)
    const lookup = new NodeLookup(this._history, dstId)
    const res = await lookup.startLookup()
    this.logger(`historyRecursiveFindNodes request returned ${res}`)
    return res ?? ''
  }
  async historyLocalContent(params: [string]) {
    const [contentKey] = params
    this.logger(`Received historyLocalContent request for ${contentKey}`)
    let res
    try {
      res = await this._history.findContentLocally(fromHexString(contentKey))
    } catch (err) {
      res = (err as any).message
    }
    console.log(res)
    return res
  }
  async historyFindContent(params: [string, string]) {
    const [nodeId, contentKey] = params
    const res = await this._history.sendFindContent(nodeId, fromHexString(contentKey))
    return res
  }
  async historyRecursiveFindContent(params: [string]) {
    const [contentKey] = params
    const lookup = new ContentLookup(this._history, fromHexString(contentKey))
    const res = await lookup.startLookup()
    if (res instanceof Uint8Array) {
      return toHexString(res)
    }
    return res
  }
  async historyOffer(params: [string, string[]]) {
    const [dstId, contentKeys] = params
    const keys = contentKeys.map((key) => fromHexString(key))
    const res = await this._history.sendOffer(dstId, keys)
    return res
  }
  async historyGossip(params: [string, string]) {
    const [contentKey, content] = params
    const res = await this._history.gossipContent(fromHexString(contentKey), fromHexString(content))
    return res
  }
  async historyStore(params: [string, string]) {
    const [contentKey, content] = params.map((param) => fromHexString(param))
    try {
      await this._history.addContentToHistory(
        contentKey[0] as HistoryNetworkContentTypes,
        toHexString(contentKey.slice(1)),
        content
      )
      return true
    } catch {
      return false
    }
  }
}
