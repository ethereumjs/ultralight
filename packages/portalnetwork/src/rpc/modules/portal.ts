import { Debugger } from 'debug'
import {
  ENR,
  ProtocolId,
  fromHexString,
  shortId,
  HistoryNetworkContentKeyType,
  toHexString,
  HistoryProtocol,
  PortalNetwork,
} from '../../index.js'
import { isValidId } from '../util.js'
import { middleware, validators } from '../validators.js'

const methods = [
  'portal_historyAddBootnode',
  'portal_historyNodeInfo',
  'portal_historyRoutingTableInfo',
  'portal_historyLookupEnr',
  'portal_historyAddEnrs',
  'portal_historyPing',
  'portal_historyFindNodes',
  'portal_historyLocalContent',
  'portal_historyFindContent',
  'portal_historyOffer',
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
    this.historyAddBootNode = middleware(this.historyAddBootNode.bind(this), 1, [
      [validators.array(validators.enr)],
    ])
    this.historyAddEnrs = middleware(this.historyAddEnrs.bind(this), 1, [
      [validators.array(validators.enr)],
    ])
    this.historyDeleteEnr = middleware(this.historyDeleteEnr.bind(this), 1, [validators.dstId])
    this.historyPing = middleware(this.historyPing.bind(this), 1, [[validators.enr]])
    this.historyFindNodes = middleware(this.historyFindNodes.bind(this), 2, [
      [validators.dstId],
      [validators.array(validators.distance)],
    ])
    this.historyLocalContent = middleware(this.historyLocalContent.bind(this), 1, [
      [validators.hex],
    ])
    this.historyFindContent = middleware(this.historyFindContent.bind(this), 2, [
      [validators.dstId],
      [validators.hex],
    ])
    this.historyOffer = middleware(this.historyOffer.bind(this), 2, [
      [validators.dstId],
      [validators.array(validators.blockHash)],
      [validators.array(validators.history_contentType)],
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
  async historyDeleteEnr(params: [string]): Promise<boolean> {
    const [nodeId] = params
    this._history.routingTable.evictNode(nodeId)
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
  async historyPing(params: [string]) {
    const [enr] = params
    const encodedENR = ENR.decodeTxt(enr)
    this.logger(`PING request received on HistoryNetwork for ${shortId(encodedENR.nodeId)}`)
    const pong = await this._history.sendPing(enr)
    if (pong) {
      return `PING/PONG successful with ${encodedENR.nodeId}`
    } else {
      return `PING/PONG with ${encodedENR.nodeId} was unsuccessful`
    }
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
  async historyOffer(params: [string, string[], number[]]) {
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
      return HistoryNetworkContentKeyType.serialize(
        Buffer.concat([Uint8Array.from([contentTypes[idx]]), fromHexString(blockHash)])
      )
    })
    const protocol = this._client.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
    const res = await protocol.sendOffer(dstId, contentKeys)
    return res
  }
}
