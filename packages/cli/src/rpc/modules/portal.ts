import { EntryStatus } from '@chainsafe/discv5'
import { ENR } from '@chainsafe/enr'
import { BitArray } from '@chainsafe/ssz'
import { bytesToHex, short } from '@ethereumjs/util'
import {
  ContentLookup,
  ContentMessageType,
  FoundContent,
  MessageCodes,
  NetworkId,
  NodeLookup,
  PingPongCustomDataType,
  PortalWireMessageType,
  fromHexString,
  shortId,
  toHexString,
} from 'portalnetwork'

import { INVALID_PARAMS } from '../error-code.js'
import { isValidId } from '../util.js'
import { middleware, validators } from '../validators.js'

import type { GetEnrResult } from '../schema/types.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Debugger } from 'debug'
import type {
  AcceptMessage,
  BeaconLightClientNetwork,
  HistoryNetwork,
  NodesMessage,
  PortalNetwork,
  StateNetwork,
} from 'portalnetwork'

const methods = [
  // state
  'portal_stateAddEnr',
  'portal_stateAddEnrs',
  'portal_stateGetEnr',
  'portal_stateDeleteEnr',
  'portal_stateLookupEnr',
  'portal_statePing',
  'portal_stateRoutingTableInfo',
  'portal_stateStore',
  'portal_stateLocalContent',
  'portal_stateGossip',
  'portal_stateFindContent',
  'portal_stateRecursiveFindContent',
  'portal_stateOffer',
  'portal_stateSendOffer',
  // history
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
  'portal_historyAddEnr',
  'portal_historyGetEnr',
  'portal_historyDeleteEnr',
  'portal_historyLookupEnr',
  // beacon
  'portal_beaconSendFindContent',
  'portal_beaconFindContent',
  'portal_beaconStore',
  'portal_beaconLocalContent',
  'portal_beaconAddEnr',
  'portal_beaconGetEnr',
  'portal_beaconDeleteEnr',
  'portal_beaconLookupEnr',

  // not included in portal-network-specs
  'portal_historyAddEnrs',
  'portal_historyAddBootNode',
  'portal_historyNodeInfo',
  'portal_beaconAddBootNode',
  `portal_beaconStartLightClient`,
]

export class portal {
  private _client: PortalNetwork
  private _history: HistoryNetwork
  private _beacon: BeaconLightClientNetwork
  private _state: StateNetwork
  private logger: Debugger

  constructor(client: PortalNetwork, logger: Debugger) {
    this._client = client
    this._history = this._client.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    this._beacon = this._client.networks.get(
      NetworkId.BeaconChainNetwork,
    ) as BeaconLightClientNetwork
    this._state = this._client.networks.get(NetworkId.StateNetwork) as StateNetwork
    this.logger = logger
    this.methods = middleware(this.methods.bind(this), 0, [])
    this.historyNodeInfo = middleware(this.historyNodeInfo.bind(this), 0, [])
    this.stateRoutingTableInfo = middleware(this.stateRoutingTableInfo.bind(this), 0, [])
    this.historyRoutingTableInfo = middleware(this.historyRoutingTableInfo.bind(this), 0, [])
    this.historyLookupEnr = middleware(this.historyLookupEnr.bind(this), 1, [[validators.dstId]])
    this.historyAddBootNode = middleware(this.historyAddBootNode.bind(this), 1, [[validators.enr]])
    this.historyAddEnr = middleware(this.historyAddEnr.bind(this), 1, [[validators.enr]])
    this.historyGetEnr = middleware(this.historyGetEnr.bind(this), 1, [[validators.dstId]])
    this.historyDeleteEnr = middleware(this.historyDeleteEnr.bind(this), 1, [[validators.dstId]])
    this.historyAddEnrs = middleware(this.historyAddEnrs.bind(this), 1, [
      [validators.array(validators.enr)],
    ])
    this.stateAddEnr = middleware(this.stateAddEnr.bind(this), 1, [[validators.enr]])
    this.stateGetEnr = middleware(this.stateGetEnr.bind(this), 1, [[validators.dstId]])
    this.stateLookupEnr = middleware(this.stateLookupEnr.bind(this), 1, [[validators.dstId]])
    this.stateDeleteEnr = middleware(this.stateDeleteEnr.bind(this), 1, [[validators.dstId]])
    this.stateAddEnrs = middleware(this.stateAddEnrs.bind(this), 1, [
      [validators.array(validators.enr)],
    ])
    this.historyPing = middleware(this.historyPing.bind(this), 1, [[validators.enr]])
    this.statePing = middleware(this.statePing.bind(this), 1, [[validators.enr]])
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
    this.stateFindNodes = middleware(this.stateFindNodes.bind(this), 2, [
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
    this.stateLocalContent = middleware(this.stateLocalContent.bind(this), 1, [[validators.hex]])
    this.historyStore = middleware(this.historyStore.bind(this), 2, [
      [validators.contentKey],
      [validators.hex],
    ])
    this.stateStore = middleware(this.stateStore.bind(this), 2, [
      [validators.hex],
      [validators.hex],
    ])
    this.historyFindContent = middleware(this.historyFindContent.bind(this), 2, [
      [validators.enr],
      [validators.hex],
    ])
    this.historyRecursiveFindContent = middleware(this.historyRecursiveFindContent.bind(this), 1, [
      [validators.contentKey],
    ])
    this.stateFindContent = middleware(this.stateFindContent.bind(this), 2, [
      [validators.enr],
      [validators.hex],
    ])
    this.stateRecursiveFindContent = middleware(this.stateRecursiveFindContent.bind(this), 1, [
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
    this.stateOffer = middleware(this.stateOffer.bind(this), 3, [
      [validators.enr],
      [validators.hex],
      [validators.hex],
    ])
    this.stateSendOffer = middleware(this.stateSendOffer.bind(this), 2, [
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
    this.stateGossip = middleware(this.stateGossip.bind(this), 2, [
      [validators.hex],
      [validators.hex],
    ])
    this.beaconSendFindContent = middleware(this.beaconSendFindContent.bind(this), 2, [
      [validators.dstId],
      [validators.hex],
    ])
    this.beaconFindContent = middleware(this.beaconFindContent.bind(this), 2, [
      [validators.enr],
      [validators.hex],
    ])
    this.beaconStore = middleware(this.beaconStore.bind(this), 2, [
      [validators.hex],
      [validators.hex],
    ])

    this.beaconLocalContent = middleware(this.beaconLocalContent.bind(this), 1, [[validators.hex]])

    this.beaconAddBootNode = middleware(this.beaconAddBootNode.bind(this), 1, [[validators.enr]])

    this.beaconStartLightClient = middleware(this.beaconStartLightClient.bind(this), 1, [
      [validators.hex],
    ])

    this.beaconAddEnr = middleware(this.beaconAddEnr.bind(this), 1, [[validators.enr]])
    this.beaconGetEnr = middleware(this.beaconGetEnr.bind(this), 1, [[validators.dstId]])
    this.beaconDeleteEnr = middleware(this.beaconDeleteEnr.bind(this), 1, [[validators.dstId]])
    this.beaconLookupEnr = middleware(this.beaconLookupEnr.bind(this), 1, [[validators.dstId]])

    this.beaconPing = middleware(this.beaconPing.bind(this), 1, [[validators.enr]])
  }

  async sendPortalNetworkResponse(
    nodeId: string,
    socketAddr: Multiaddr,
    requestId: bigint,
    payload: Uint8Array,
  ) {
    void this._client.sendPortalNetworkResponse(
      {
        nodeId,
        socketAddr,
      },
      BigInt(requestId),
      payload,
    )
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
    this.logger(`portal_historyAddBootNode request received for ${enr.slice(0, 10)}...`)
    try {
      await this._history.addBootNode(enr)
    } catch (err) {
      this.logger(err)
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
      localNodeId,
      buckets,
    }
  }
  async stateAddEnrs(params: [string[]]): Promise<boolean> {
    const [enrs] = params
    const encodedENRs = enrs.map((enr) => ENR.decodeTxt(enr))
    const shortEnrs = Object.fromEntries(
      encodedENRs.map((enr, idx) => [idx, enr.nodeId.slice(0, 15) + '...']),
    )
    this.logger(`portal_stateAddEnrs request received for ${shortEnrs}`)
    const added: number[] = []

    try {
      for (const [idx, enr] of encodedENRs.entries()) {
        await this._state.addBootNode(enr.encodeTxt())
        added.push(idx)
      }
    } catch {
      return false
    }
    return true
  }
  async stateGetEnr(params: [string]): Promise<GetEnrResult> {
    const [nodeId] = params
    if (nodeId === this._client.discv5.enr.nodeId) {
      return this._client.discv5.enr.encodeTxt()
    }
    this.logger.extend('portal_stateGetEnr')(` request received for ${nodeId.slice(0, 10)}...`)
    const enr = this._state.routingTable.getWithPending(nodeId)?.value
    if (enr) {
      const enrTxt = enr.encodeTxt()
      this.logger.extend('portal_stateGetEnr')(enrTxt)
      return enrTxt
    }
    this.logger.extend('portal_stateGetEnr')('ENR not found')
    return ''
  }

  async stateAddEnr(params: [string]): Promise<boolean> {
    const [enr] = params
    const encodedENR = ENR.decodeTxt(enr)
    const shortEnr = encodedENR.nodeId.slice(0, 15) + '...'
    this.logger(`portal_stateAddEnr request received for ${shortEnr}`)
    try {
      if (this._state.routingTable.getWithPending(encodedENR.nodeId)?.value) {
        return true
      }
      this._client.discv5.addEnr(enr)
      this._state.routingTable.insertOrUpdate(encodedENR, EntryStatus.Connected)
      return true
    } catch {
      return false
    }
  }
  async stateDeleteEnr(params: [string]): Promise<boolean> {
    const [nodeId] = params
    this.logger(`portal_stateDeleteEnr request received for ${nodeId.slice(0, 10)}...`)
    const remove = this._state.routingTable.removeById(nodeId)
    return remove !== undefined
  }
  async stateLookupEnr(params: [string]) {
    const [nodeId] = params
    if (nodeId === this._client.discv5.enr.nodeId) {
      return this._client.discv5.enr.encodeTxt()
    }
    this.logger(`Looking up ENR for NodeId: ${shortId(nodeId)}`)
    const enr = this._state.routingTable.getWithPending(nodeId)?.value.encodeTxt()
    this.logger(`Found: ${enr}`)
    return enr ?? ''
  }
  async stateRoutingTableInfo(_params: []): Promise<any> {
    this.logger(`portal_stateRoutingTableInfo request received.`)
    let localNodeId = ''
    let buckets: string[][] = []
    const table = this._state.routingTable
    try {
      localNodeId = table.localId
      buckets = table.buckets
        .map((bucket) => bucket.values().map((value) => value.nodeId))
        .reverse()
    } catch (err) {
      localNodeId = (err as any).message
    }
    return {
      localNodeId,
      buckets,
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
  async statePing(params: [string]) {
    const [enr] = params
    const encodedENR = ENR.decodeTxt(enr)
    this.logger(`PING request received on StateNetwork for ${shortId(encodedENR.nodeId)}`)
    const pong = await this._state.sendPing(encodedENR)
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
      await this.sendPortalNetworkResponse(
        enr.nodeId,
        enr.getLocationMultiaddr('udp')!,
        BigInt(requestId),
        pongMsg,
      )
    } catch {
      return false
    }
    return true
  }
  async historyFindNodes(params: [string, number[]]) {
    const [enr, distances] = params
    const dstId = ENR.decodeTxt(enr).nodeId
    this.logger(`findNodes request received with these distances [${distances.toString()}]`)
    this.logger(`sending findNodes request to ${shortId(dstId)}`)
    if (!isValidId(dstId)) {
      return {
        code: INVALID_PARAMS,
        message: 'invalid node id',
      }
    }
    const res = await this._history.sendFindNodes(enr, distances)
    if (!res) {
      return []
    }
    const enrs = res?.enrs.map((v) => ENR.decode(v).encodeTxt())
    this.logger(`findNodes request returned ${res?.total} enrs:`)
    this.logger(enrs)
    return res?.enrs.map((v) => ENR.decode(v).encodeTxt())
  }
  async stateFindNodes(params: [string, number[]]) {
    const [enr, distances] = params
    const dstId = ENR.decodeTxt(enr).nodeId
    this.logger(`stateFindNodes request received with these distances [${distances.toString()}]`)
    this.logger(`sending stateFindNodes request to ${shortId(dstId)}`)
    if (!isValidId(dstId)) {
      return {
        code: INVALID_PARAMS,
        message: 'invalid node id',
      }
    }
    const res = await this._state.sendFindNodes(enr, distances)
    if (!res) {
      return []
    }
    const enrs = res?.enrs.map((v) => ENR.decode(v).encodeTxt())
    this.logger(`stateFindNodes request returned ${res?.total} enrs:`)
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
      void this.sendPortalNetworkResponse(
        dstId,
        enr.getLocationMultiaddr('udp')!,
        BigInt(requestId),
        encodedPayload,
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
    this.logger.extend(`historyLocalContent`)(
      `request returned ${res !== undefined ? res.length : 'null'} bytes`,
    )
    this.logger.extend(`historyLocalContent`)(
      `${res !== undefined ? toHexString(res) : 'content not found'}`,
    )
    if (res === undefined) {
      throw {
        code: -32009,
        message: 'no content found',
      }
    }
    return toHexString(res)
  }
  async stateLocalContent(params: [string]): Promise<string | undefined> {
    const [contentKey] = params
    this.logger(`Received stateLocalContent request for ${contentKey}`)

    const res = await this._state.findContentLocally(fromHexString(contentKey))
    this.logger.extend(`stateLocalContent`)(`request returned ${res?.length} bytes`)
    this.logger.extend(`stateLocalContent`)(
      `${res !== undefined ? toHexString(res) : 'content not found'}`,
    )
    if (res === undefined) {
      throw {
        code: -32009,
        message: 'no content found',
      }
    }
    return toHexString(res)
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
    this.logger.extend('findContent')(
      `request returned type: ${res ? FoundContent[res.selector] : res}`,
    )
    if (!res) {
      return { enrs: [] }
    }
    let content: Uint8Array | Uint8Array[] = []
    switch (res.selector) {
      case FoundContent.ENRS:
        content = res.value as Uint8Array[]
        break
      case FoundContent.CONTENT:
      case FoundContent.UTP:
        content = res.value as Uint8Array
        break
    }

    this.logger.extend('findContent')(`request returned ${content.length} bytes`)

    const returnVal =
      res.selector === FoundContent.ENRS
        ? { enrs: (<Uint8Array[]>content).map((v) => ENR.decode(v).encodeTxt()) }
        : {
            content: content.length > 0 ? toHexString(content as Uint8Array) : '0x',
            utpTransfer: res.selector === FoundContent.UTP,
          }
    this.logger.extend('findContent')({
      selector: FoundContent[res.selector],
      value: returnVal,
    })
    return returnVal
  }

  async stateFindContent(params: [string, string]) {
    const [enr, contentKey] = params
    const nodeId = ENR.decodeTxt(enr).nodeId
    if (!this._state.routingTable.getWithPending(nodeId)?.value) {
      const pong = await this._state.sendPing(enr)
      if (!pong) {
        return ''
      }
    }
    const res = await this._state.sendFindContent(nodeId, fromHexString(contentKey))
    this.logger.extend('findContent')(
      `request returned type: ${res ? FoundContent[res.selector] : res}`,
    )
    if (!res) {
      return { enrs: [] }
    }
    let content: Uint8Array | Uint8Array[] = []
    switch (res.selector) {
      case FoundContent.ENRS:
        content = res.value as Uint8Array[]
        break
      case FoundContent.CONTENT:
      case FoundContent.UTP:
        content = res.value as Uint8Array
        break
    }

    this.logger.extend('findContent')(`request returned ${content.length} bytes`)

    this.logger.extend('findContent')(content)
    return res.selector === FoundContent.ENRS
      ? { enrs: content }
      : {
          content: content.length > 0 ? toHexString(content as Uint8Array) : '',
          utpTransfer: res.selector === FoundContent.UTP,
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
    void this.sendPortalNetworkResponse(
      nodeId,
      enr?.getLocationMultiaddr('udp')!,
      enr!.seq,
      Uint8Array.from(Buffer.concat([Buffer.from([MessageCodes.CONTENT]), Buffer.from(payload)])),
    )
    return '0x' + enr!.seq.toString(16)
  }
  async historyRecursiveFindContent(params: [string]) {
    const [contentKey] = params
    this.logger.extend('historyRecursiveFindContent')(`request received for ${contentKey}`)
    const lookup = new ContentLookup(this._history, fromHexString(contentKey))
    const res = await lookup.startLookup()
    if (!res) {
      this.logger.extend('historyRecursiveFindContent')(`request returned { enrs: [] }`)
      throw new Error('No content found')
    }
    if ('enrs' in res) {
      this.logger.extend('historyRecursiveFindContent')(
        `request returned { enrs: [{${{ enrs: res.enrs.map(toHexString) }}}] }`,
      )
      if (res.enrs.length === 0) {
        throw new Error('No content found')
      }
      return { enrs: res.enrs.map(toHexString) }
    } else {
      this.logger.extend('historyRecursiveFindContent')(
        `request returned { content: ${short(toHexString(res.content))}, utpTransfer: ${res.utp} }`,
      )
      return {
        content: toHexString(res.content),
        utpTransfer: res.utp,
      }
    }
  }
  async stateRecursiveFindContent(params: [string]) {
    const [contentKey] = params
    this.logger.extend('stateRecursiveFindContent')(`request received for ${contentKey}`)
    const lookup = new ContentLookup(this._state, fromHexString(contentKey))
    const res = await lookup.startLookup()
    this.logger.extend('stateRecursiveFindContent')(`request returned ${JSON.stringify(res)}`)
    if (!res) {
      this.logger.extend('stateRecursiveFindContent')(`request returned { enrs: [] }`)
      throw new Error('No content found')
    }
    if ('enrs' in res) {
      this.logger.extend('stateRecursiveFindContent')(
        `request returned { enrs: [{${{ enrs: res.enrs.map(toHexString) }}}] }`,
      )
      if (res.enrs.length === 0) {
        throw new Error('No content found')
      }
      return { enrs: res.enrs.map(toHexString) }
    } else {
      this.logger.extend('stateRecursiveFindContent')(
        `request returned { content: ${toHexString(res.content)}, utpTransfer: ${res.utp} }`,
      )
      return {
        content: toHexString(res.content),
        utpTransfer: res.utp,
      }
    }
  }
  async historyOffer(params: [string, string, string]) {
    const [enrHex, contentKeyHex, contentValueHex] = params
    const enr = ENR.decodeTxt(enrHex)
    if (this._history.routingTable.getWithPending(enr.nodeId)?.value === undefined) {
      const res = await this._history.sendPing(enr)
      if (res === undefined) {
        return '0x'
      }
    }
    const res = await this._history.sendOffer(
      enr.nodeId,
      [fromHexString(contentKeyHex)],
      [fromHexString(contentValueHex)],
    )
    return res
  }
  async historySendOffer(params: [string, string[]]) {
    const [dstId, contentKeys] = params
    const keys = contentKeys.map((key) => fromHexString(key))
    const res = await this._history.sendOffer(dstId, keys)
    const enr = this._history.routingTable.getWithPending(dstId)?.value
    return res && enr && '0x' + enr.seq.toString(16)
  }
  async stateOffer(params: [string, string, string]) {
    const [enrHex, contentKeyHex, contentValueHex] = params
    const enr = ENR.decodeTxt(enrHex)
    if (this._state.routingTable.getWithPending(enr.nodeId)?.value === undefined) {
      const res = await this._state.sendPing(enr)
      if (res === undefined) {
        return '0x'
      }
    }
    const res = await this._state.sendOffer(
      enr.nodeId,
      [fromHexString(contentKeyHex)],
      [fromHexString(contentValueHex)],
    )
    return res
  }
  async stateSendOffer(params: [string, string[]]) {
    const [dstId, contentKeys] = params
    const keys = contentKeys.map((key) => fromHexString(key))
    const res = await this._state.sendOffer(dstId, keys)
    const enr = this._state.routingTable.getWithPending(dstId)?.value
    return res && enr && '0x' + enr.seq.toString(16)
  }
  async historySendAccept(params: [string, string, string[]]) {
    const [enr, connectionId, contentKeys] = params
    const myEnr = this._client.discv5.enr
    const _enr = ENR.decodeTxt(enr)
    const accepted: boolean[] = Array(contentKeys.length).fill(false)
    for (let x = 0; x < contentKeys.length; x++) {
      try {
        await this._history.db.get(contentKeys[x])
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
    void this.sendPortalNetworkResponse(
      _enr.nodeId,
      _enr.getLocationMultiaddr('udp')!,
      myEnr.seq,
      encodedPayload,
    )

    return '0x' + myEnr.seq.toString(16)
  }
  async historyGossip(params: [string, string]) {
    const [contentKey, content] = params
    this.logger(`historyGossip request received for ${contentKey}`)
    const res = await this._history.gossipContent(fromHexString(contentKey), fromHexString(content))
    return res
  }
  async stateGossip(params: [string, string]) {
    const [contentKey, content] = params
    this.logger(`stateGossip request received for ${contentKey}`)
    const res = await this._state.gossipContent(fromHexString(contentKey), fromHexString(content))
    return res
  }
  async historyStore(params: [string, string]) {
    const [contentKey, content] = params.map((param) => fromHexString(param))
    try {
      await this._history.store(contentKey, content)
      return true
    } catch {
      return false
    }
  }
  async stateStore(params: [string, string]) {
    const [contentKey, content] = params
    try {
      const contentKeyBytes = fromHexString(contentKey)
      await this._state.store(contentKeyBytes, fromHexString(content))
      this.logger(`stored ${contentKey} in state network db`)
      return true
    } catch {
      this.logger(`stateStore failed for ${contentKey}`)
      return false
    }
  }

  async beaconSendFindContent(params: [string, string]) {
    const [nodeId, contentKey] = params
    console.log(nodeId)
    const res = await this._beacon.sendFindContent(nodeId, fromHexString(contentKey))
    if (res !== undefined && res.selector === 1) return toHexString(res.value as Uint8Array)
    return '0x'
  }

  async beaconFindContent(params: [string, string]) {
    const [enr, contentKey] = params
    const nodeId = ENR.decodeTxt(enr).nodeId
    this.logger.extend('findContent')(
      `received request to send request to ${shortId(nodeId)} for contentKey ${contentKey}`,
    )
    if (!this._beacon.routingTable.getWithPending(nodeId)?.value) {
      const pong = await this._beacon.sendPing(enr)
      if (!pong) {
        return ''
      }
    }

    const res = await this._beacon.sendFindContent(nodeId, fromHexString(contentKey))
    this.logger.extend('findContent')(
      `request returned type: ${res ? FoundContent[res.selector] : res}`,
    )

    if (!res) {
      return { enrs: [] }
    }
    let content: Uint8Array | Uint8Array[] = []
    switch (res.selector) {
      case FoundContent.ENRS:
        content = res.value as Uint8Array[]
        break
      case FoundContent.CONTENT:
      case FoundContent.UTP:
        content = res.value as Uint8Array
        break
    }

    this.logger.extend('findContent')(`request returned ${content.length} bytes`)

    const returnVal =
      res.selector === FoundContent.ENRS
        ? { enrs: (<Uint8Array[]>content).map((v) => ENR.decode(v).encodeTxt()) }
        : {
            content: content.length > 0 ? toHexString(content as Uint8Array) : '0x',
            utpTransfer: res.selector === FoundContent.UTP,
          }
    this.logger.extend('findContent')({
      selector: FoundContent[res.selector],
      value: returnVal,
    })
    return returnVal
  }

  async beaconStore(params: [string, string]) {
    const [contentKey, content] = params.map((param) => fromHexString(param))
    try {
      await this._beacon.store(contentKey, content)
      return true
    } catch (e) {
      console.log(e)
      return false
    }
  }

  async beaconLocalContent(params: [string]) {
    const [contentKey] = params
    this.logger.extend(`beaconLocalContent`)(`Received request for ${contentKey}`)

    const content = await this._beacon.findContentLocally(fromHexString(contentKey))
    this.logger.extend(`beaconLocalContent`)(
      `request returned ${content !== undefined ? content.length : 'null'} bytes`,
    )
    this.logger.extend(`beaconLocalContent`)(
      `retrieved content: ${content !== undefined ? short(toHexString(content)) : 'content not found'}`,
    )
    if (content !== undefined) return toHexString(content)
    throw {
      code: -32009,
      message: 'no content found',
    }
  }

  async beaconAddBootNode(params: [string]): Promise<boolean> {
    const [enr] = params
    this.logger(`portal_beaconAddBootNode request received for ${enr.slice(0, 10)}...`)
    try {
      await this._beacon.addBootNode(enr)
    } catch (err) {
      this.logger(err)
      return false
    }
    return true
  }

  async beaconStartLightClient(params: [string]): Promise<boolean | string> {
    const [bootstrapHash] = params
    this.logger(`portal_beaconStartLightClient request received for ${bootstrapHash}`)
    try {
      await this._beacon.initializeLightClient(bootstrapHash)
      return true
    } catch (err: any) {
      return err.message
    }
  }

  async beaconGetEnr(params: [string]): Promise<GetEnrResult> {
    const [nodeId] = params
    if (nodeId === this._client.discv5.enr.nodeId) {
      return this._client.discv5.enr.encodeTxt()
    }
    this.logger.extend('portal_beaconGetEnr')(` request received for ${nodeId.slice(0, 10)}...`)
    const enr = this._beacon.routingTable.getWithPending(nodeId)?.value
    if (enr) {
      const enrTxt = enr.encodeTxt()
      this.logger.extend('portal_beaconGetEnr')(enrTxt)
      return enrTxt
    }
    this.logger.extend('portal_beaconGetEnr')('ENR not found')
    return ''
  }

  async beaconAddEnr(params: [string]): Promise<boolean> {
    const [enr] = params
    const encodedENR = ENR.decodeTxt(enr)
    const shortEnr = encodedENR.nodeId.slice(0, 15) + '...'
    this.logger(`portal_beaconAddEnr request received for ${shortEnr}`)
    try {
      if (this._beacon.routingTable.getWithPending(encodedENR.nodeId)?.value) {
        return true
      }
      this._client.discv5.addEnr(enr)
      this._beacon.routingTable.insertOrUpdate(encodedENR, EntryStatus.Connected)
      return true
    } catch {
      return false
    }
  }
  async beaconDeleteEnr(params: [string]): Promise<boolean> {
    const [nodeId] = params
    this.logger(`portal_beaconDeleteEnr request received for ${nodeId.slice(0, 10)}...`)
    const remove = this._beacon.routingTable.removeById(nodeId)
    return remove !== undefined
  }

  async beaconLookupEnr(params: [string]) {
    const [nodeId] = params
    if (nodeId === this._client.discv5.enr.nodeId) {
      return this._client.discv5.enr.encodeTxt()
    }
    this.logger(`Looking up ENR for NodeId: ${shortId(nodeId)}`)
    const enr = this._beacon.routingTable.getWithPending(nodeId)?.value.encodeTxt()
    this.logger(`Found: ${enr}`)
    return enr ?? ''
  }

  async beaconPing(params: [string]) {
    const [enr] = params
    const encodedENR = ENR.decodeTxt(enr)
    this.logger(`PING request received on BeaconNetwork for ${shortId(encodedENR.nodeId)}`)
    const pong = await this._beacon.sendPing(encodedENR)
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
}
