import { EntryStatus } from '@chainsafe/discv5'
import { BitArray } from '@chainsafe/ssz'
import { Debugger } from 'debug'
import {
  ENR,
  ProtocolId,
  fromHexString,
  shortId,
  toHexString,
  HistoryProtocol,
  PortalNetwork,
  HistoryNetworkContentType,
  ContentLookup,
  NodeLookup,
  PingPongCustomDataType,
  PortalWireMessageType,
  MessageCodes,
  NodesMessage,
  ContentMessageType,
  AcceptMessage,
  decodeHistoryNetworkContentKey,
} from 'portalnetwork'
import { GetEnrResult } from '../schema/types.js'
import { isValidId } from '../util.js'
import { middleware, validators } from '../validators.js'

const methods = [
  'portal_historyRoutingTableInfo',
  'portal_historyAddEnr',
  'portal_historyGetEnr',
  'portal_historyDeleteEnr',
  'portal_historyLookupEnr',
  'portal_historySendPing',
  'portal_historySendPong',
  'portal_historySendFindNodes',
  'portal_historySendNodes',
  'portal_historySendFindContent',
  'portal_historySendContent',
  'portal_historySendOffer',
  'portal_historySendAccept',
  'portal_historyPing',
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
    this.historyLookupEnr = middleware(this.historyLookupEnr.bind(this), 1, [[validators.dstId]])
    this.historyAddBootNode = middleware(this.historyAddBootNode.bind(this), 1, [[validators.enr]])
    this.historyAddEnr = middleware(this.historyAddEnr.bind(this), 1, [[validators.enr]])
    this.historyGetEnr = middleware(this.historyGetEnr.bind(this), 1, [[validators.dstId]])
    this.historyDeleteEnr = middleware(this.historyDeleteEnr.bind(this), 1, [[validators.dstId]])
    this.historyAddEnrs = middleware(this.historyAddEnrs.bind(this), 1, [
      [validators.array(validators.enr)],
    ])
    this.historyPing = middleware(this.historyPing.bind(this), 1, [[validators.enr]])
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
      [validators.enr],
      [validators.array(validators.distance)],
    ])
    this.historySendFindNodes = middleware(this.historySendFindNodes.bind(this), 2, [
      [validators.dstId],
      [validators.array(validators.distance)],
    ])
    this.historyRecursiveFindNodes = middleware(this.historyRecursiveFindNodes.bind(this), 1, [
      [validators.dstId],
    ])
    this.historySendNodes = middleware(this.historySendNodes.bind(this), 2, [
      [validators.dstId],
      [validators.array(validators.enr)],
      [validators.hex],
    ])
    this.historyLocalContent = middleware(this.historyLocalContent.bind(this), 1, [
      [validators.hex],
    ])
    this.historyStore = middleware(this.historyStore.bind(this), 2, [
      [validators.contentKey],
      [validators.hex],
    ])
    this.historyFindContent = middleware(this.historyFindContent.bind(this), 2, [
      [validators.enr],
      [validators.hex],
    ])
    this.historyRecursiveFindContent = middleware(this.historyRecursiveFindContent.bind(this), 1, [
      [validators.contentKey],
    ])
    this.historyOffer = middleware(this.historyOffer.bind(this), 3, [
      [validators.enr],
      [validators.hex],
      [validators.hex],
    ])
    this.historySendOffer = middleware(this.historySendOffer.bind(this), 2, [
      [validators.dstId],
      [validators.array(validators.hex)],
    ])
    this.historySendAccept = middleware(this.historySendAccept.bind(this), 2, [
      [validators.enr],
      [validators.hex],
      [validators.array(validators.contentKey)],
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
      encodedENRs.map((enr, idx) => [idx, enr.nodeId.slice(0, 15) + '...']),
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
    if (nodeId === this._client.discv5.enr.nodeId) {
      return this._client.discv5.enr.encodeTxt()
    }
    this.logger.extend('portal_historyGetEnr')(` request received for ${nodeId.slice(0, 10)}...`)
    const enr = this._history.routingTable.getWithPending(nodeId)?.value
    if (enr) {
      const enrTxt = enr.encodeTxt()
      this.logger.extend('portal_historyGetEnr')(enrTxt)
      return enrTxt
    }
    this.logger.extend('portal_historyGetEnr')('ENR not found')
    return ''
  }

  async historyAddEnr(params: [string]): Promise<boolean> {
    const [enr] = params
    const encodedENR = ENR.decodeTxt(enr)
    const shortEnr = encodedENR.nodeId.slice(0, 15) + '...'
    this.logger(`portal_historyAddEnr request received for ${shortEnr}`)
    try {
      if (this._history.routingTable.getWithPending(encodedENR.nodeId)?.value) {
        return true
      }
      this._client.discv5.addEnr(enr)
      this._history.routingTable.insertOrUpdate(encodedENR, EntryStatus.Connected)
      return true
    } catch {
      return false
    }
  }
  async historyDeleteEnr(params: [string]): Promise<boolean> {
    const [nodeId] = params
    this.logger(`portal_historyDeleteEnr request received for ${nodeId.slice(0, 10)}...`)
    const remove = this._history.routingTable.removeById(nodeId)
    return remove !== undefined
  }
  async historyRoutingTableInfo(_params: []): Promise<any> {
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
    if (nodeId === this._client.discv5.enr.nodeId) {
      return this._client.discv5.enr.encodeTxt()
    }
    this.logger(`Looking up ENR for NodeId: ${shortId(nodeId)}`)
    const enr = this._history.routingTable.getWithPending(nodeId)?.value.encodeTxt()
    this.logger(`Found: ${enr}`)
    return enr ?? ''
  }
  async historyPing(params: [string]) {
    const [enr] = params
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
        enrSeq: Number(pong.enrSeq),
        dataRadius: toHexString(pong.customPayload),
      }
    )
  }
  async historySendPing(params: [string, string]) {
    this.logger(`portal_historySendPing`)
    const pong = await this.historyPing([params[0]])
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
        Buffer.from(pongMsg),
      )
    } catch {
      return false
    }
    return true
  }
  async historyFindNodes(params: [string, number[]]) {
    const [enr, distances] = params
    this.logger(`findNodes request received with these distances ${distances.toString()}`)
    const dstId = ENR.decodeTxt(enr).nodeId
    if (!isValidId(dstId)) {
      return 'invalid node id'
    }
    if (!this._history.routingTable.getWithPending(dstId)?.value) {
      this._client.discv5.addEnr(enr)
      this._history.routingTable.insertOrUpdate(ENR.decodeTxt(enr), EntryStatus.Disconnected)
      // const pong = await this._history.sendPing(enr)
      // if (!pong) {
      //   return ''
      // }
    }
    const res = await this._history.sendFindNodes(dstId, distances)
    if (!res) {
      return []
    }
    const enrs = res?.enrs.map((v) => ENR.decode(v).encodeTxt())
    this.logger(`findNodes request returned ${res?.total} enrs:`)
    this.logger(enrs)
    return res?.enrs.map((v) => ENR.decode(v).encodeTxt())
  }
  async historySendFindNodes(params: [string, number[]]) {
    const [dstId, distances] = params
    this.logger(`portal_historySendFindNodes`)
    try {
      const enr = this._history.routingTable.getWithPending(dstId)?.value
      if (!enr) {
        return
      }
      const res = await this._history.sendFindNodes(dstId, distances)
      return res ? '0x' + enr.seq.toString(16) : res
    } catch {
      return
    }
  }
  async historySendNodes(params: [string, string[], string]) {
    const [dstId, enrs, requestId] = params
    this.logger(`portal_historySendNodes`)
    try {
      const enr = this._history.routingTable.getWithPending(dstId)?.value
      if (!enr) {
        return
      }
      const nodesPayload: NodesMessage = {
        total: enrs.length,
        enrs: enrs.map((v) => ENR.decodeTxt(v).encode()),
      }
      const encodedPayload = PortalWireMessageType.serialize({
        selector: MessageCodes.NODES,
        value: nodesPayload,
      })
      this._client.sendPortalNetworkResponse(
        {
          nodeId: dstId,
          socketAddr: enr.getLocationMultiaddr('udp')!,
        },
        BigInt(requestId),
        Uint8Array.from(encodedPayload),
      )

      return enrs.length > 0 ? 1 : 0
    } catch {
      return
    }
  }
  async historyRecursiveFindNodes(params: [string]) {
    const [dstId] = params
    this.logger(`historyRecursiveFindNodes request received for ${dstId}`)
    const lookup = new NodeLookup(this._history, dstId)
    const res = await lookup.startLookup()
    this.logger(`historyRecursiveFindNodes request returned ${res}`)
    return res ?? ''
  }
  async historyLocalContent(params: [string]): Promise<string | undefined> {
    const [contentKey] = params
    this.logger(`Received historyLocalContent request for ${contentKey}`)

    const res = await this._history.findContentLocally(fromHexString(contentKey))
    this.logger.extend(`historyLocalContent`)(`request returned ${res.length} bytes`)
    this.logger.extend(`historyLocalContent`)(`${toHexString(res)}`)
    return res.length > 0 ? toHexString(res) : '0x'
  }
  async historyFindContent(params: [string, string]) {
    const [enr, contentKey] = params
    const nodeId = ENR.decodeTxt(enr).nodeId
    if (!this._history.routingTable.getWithPending(nodeId)?.value) {
      const pong = await this._history.sendPing(enr)
      if (!pong) {
        return ''
      }
    }
    const res = await this._history.sendFindContent(nodeId, fromHexString(contentKey))
    this.logger.extend('findContent')(`request returned type: ${res ? res.selector : res}`)
    if (!res) {
      return { enrs: [] }
    }
    const content: Uint8Array | Uint8Array[] =
      res.selector === 2
        ? (res.value as Uint8Array[])
        : res.selector === 1
        ? (res.value as Uint8Array)
        : await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              resolve(Uint8Array.from([]))
            }, 2000)
            this._client.uTP.on(
              'Stream',
              (_contentType: HistoryNetworkContentType, hash: string, value: Uint8Array) => {
                if (hash.slice(2) === contentKey.slice(4)) {
                  clearTimeout(timeout)
                  resolve(value)
                }
              },
            )
          })
    this.logger.extend('findContent')(`request returned ${content.length} bytes`)
    res.selector === 0 && this.logger.extend('findContent')('utp')
    this.logger.extend('findContent')(content)
    return res.selector === 2
      ? { enrs: content }
      : {
          content: content.length > 0 ? toHexString(content as Uint8Array) : '',
          utpTransfer: res.selector === 0,
        }
  }
  async historySendFindContent(params: [string, string]) {
    const [nodeId, contentKey] = params
    const res = await this._history.sendFindContent(nodeId, fromHexString(contentKey))
    const enr = this._history.routingTable.getWithPending(nodeId)?.value
    return res && enr && '0x' + enr.seq.toString(16)
  }
  async historySendContent(params: [string, string]) {
    const [nodeId, content] = params
    const payload = ContentMessageType.serialize({
      selector: 1,
      value: fromHexString(content),
    })
    const enr = this._history.routingTable.getWithPending(nodeId)?.value
    this._client.sendPortalNetworkResponse(
      { nodeId, socketAddr: enr?.getLocationMultiaddr('udp')! },
      enr!.seq,
      Buffer.concat([Buffer.from([MessageCodes.CONTENT]), Buffer.from(payload)]),
    )
    return '0x' + enr!.seq.toString(16)
  }
  async historyRecursiveFindContent(params: [string]) {
    const [contentKey] = params
    const lookup = new ContentLookup(this._history, fromHexString(contentKey))
    const res = await lookup.startLookup()
    this._client.uTP.on('Stream', (contentType, hash, value) => {
      if (contentType.toString(16) + hash.slice(2) === contentKey.slice(2)) {
        return {
          content: toHexString(value),
          utpTransfer: true,
        }
      }
    })
    if (!res) {
      return { enrs: [] }
    } else if (res instanceof Uint8Array) {
      return { content: toHexString(res), utpTransfer: false }
    } else {
      return { enrs: res }
    }
  }
  async historyOffer(params: [string, string, string]) {
    const [enrHex, contentKeyHex, contentValueHex] = params
    const enr = ENR.decodeTxt(enrHex)
    const contentKey = decodeHistoryNetworkContentKey(contentKeyHex)
    if (this._history.routingTable.getWithPending(enr.nodeId)?.value === undefined) {
      const res = await this._history.sendPing(enr)
      if (res === undefined) {
        return '0x'
      }
    }
    await this._history.store(
      contentKey.contentType,
      contentKey.blockHash,
      fromHexString(contentValueHex),
    )
    const res = await this._history.sendOffer(enr.nodeId, [fromHexString(contentKeyHex)])
    return res
  }
  async historySendOffer(params: [string, string[]]) {
    const [dstId, contentKeys] = params
    const keys = contentKeys.map((key) => fromHexString(key))
    const res = await this._history.sendOffer(dstId, keys)
    const enr = this._history.routingTable.getWithPending(dstId)?.value
    return res && enr && '0x' + enr.seq.toString(16)
  }
  async historySendAccept(params: [string, string, string[]]) {
    const [enr, connectionId, contentKeys] = params
    const myEnr = this._client.discv5.enr
    const _enr = ENR.decodeTxt(enr)
    const accepted: boolean[] = Array(contentKeys.length).fill(false)
    for (let x = 0; x < contentKeys.length; x++) {
      try {
        await this._client.db.get(ProtocolId.HistoryNetwork, contentKeys[x])
      } catch (err) {
        accepted[x] = true
      }
    }
    const idBuffer = Buffer.alloc(2)
    idBuffer.writeUInt16BE(Number(BigInt(connectionId)), 0)
    const payload: AcceptMessage = {
      connectionId: idBuffer,
      contentKeys: BitArray.fromBoolArray(accepted),
    }
    const encodedPayload = PortalWireMessageType.serialize({
      selector: MessageCodes.ACCEPT,
      value: payload,
    })
    this._client.sendPortalNetworkResponse(
      {
        nodeId: _enr.nodeId,
        socketAddr: _enr.getLocationMultiaddr('udp')!,
      },
      myEnr.seq,
      Buffer.from(encodedPayload),
    )

    return '0x' + myEnr.seq.toString(16)
  }
  async historyGossip(params: [string, string]) {
    const [contentKey, content] = params
    const res = await this._history.gossipContent(fromHexString(contentKey), fromHexString(content))
    return res
  }
  async historyStore(params: [string, string]) {
    const [contentKey, content] = params.map((param) => fromHexString(param))
    try {
      await this._history.store(
        contentKey[0] as HistoryNetworkContentType,
        toHexString(contentKey.slice(1)),
        content,
      )
      return true
    } catch {
      return false
    }
  }
}
