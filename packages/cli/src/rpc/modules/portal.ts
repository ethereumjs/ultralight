import { EntryStatus, distance } from '@chainsafe/discv5'
import { ENR } from '@chainsafe/enr'
import { bigIntToHex, bytesToHex, hexToBytes, short } from '@ethereumjs/util'
import {
  ContentLookup,
  FoundContent,
  NetworkId,
  NodeLookup,
  decodeExtensionPayloadToJson,
  encodeExtensionPayload,
  shortId,
} from 'portalnetwork'

import { BEACON_CLIENT_NOT_INITIALIZED, CONTENT_NOT_FOUND, INVALID_PARAMS } from '../error-code.js'
import { content_params } from '../schema/index.js'
import { callWithStackTrace, isValidId } from '../util.js'
import { middleware, validators } from '../validators.js'

import { RunStatusCode } from '@lodestar/light-client'
import type { Debugger } from 'debug'
import type { BeaconNetwork, HistoryNetwork, PortalNetwork, StateNetwork } from 'portalnetwork'
import type { GetEnrResult } from '../schema/types.js'

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
  'portal_statePutContent',
  'portal_stateLocalContent',
  'portal_stateGossip',
  'portal_stateFindContent',
  'portal_stateGetContent',
  'portal_stateTraceGetContent',
  'portal_stateOffer',
  // history
  'portal_historyRoutingTableInfo',
  'portal_historyAddEnr',
  'portal_historyGetEnr',
  'portal_historyDeleteEnr',
  'portal_historyLookupEnr',
  'portal_historyPing',
  'portal_historyFindNodes',
  'portal_historyFindContent',
  'portal_historyOffer',
  'portal_historyRecursiveFindNodes',
  'portal_historyGetContent',
  'portal_historyTraceGetContent',
  'portal_historyStore',
  'portal_historyPutContent',
  'portal_historyLocalContent',
  'portal_historyGossip',
  'portal_historyAddEnr',
  'portal_historyGetEnr',
  'portal_historyDeleteEnr',
  'portal_historyLookupEnr',
  // beacon
  'portal_beaconFindContent',
  'portal_beaconGetContent',
  'portal_beaconTraceGetContent',
  'portal_beaconStore',
  'portal_beaconPutContent',
  'portal_beaconLocalContent',
  'portal_beaconAddEnr',
  'portal_beaconGetEnr',
  'portal_beaconDeleteEnr',
  'portal_beaconLookupEnr',
  'portal_beaconOffer',
  'portal_beaconOptimisticStateRoot',
  'portal_beaconFinalizedStateRoot',

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
  private _beacon: BeaconNetwork
  private _state: StateNetwork
  private logger: Debugger

  constructor(client: PortalNetwork, logger: Debugger) {
    this._client = client
    this._history = this._client.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
    this._beacon = this._client.networks.get(NetworkId.BeaconChainNetwork) as BeaconNetwork
    this._state = this._client.networks.get(NetworkId.StateNetwork) as StateNetwork
    this.logger = logger
    this.methods = middleware(this.methods.bind(this), 0, [])

    // portal_*NodeInfo
    this.historyNodeInfo = middleware(this.historyNodeInfo.bind(this), 0, [])

    // portal_*RoutingTableInfo
    this.stateRoutingTableInfo = middleware(this.stateRoutingTableInfo.bind(this), 0, [])
    this.historyRoutingTableInfo = middleware(this.historyRoutingTableInfo.bind(this), 0, [])
    this.historyRoutingTableENRs = middleware(this.historyRoutingTableENRs.bind(this), 0, [])

    // portal_*LookupEnr
    this.historyLookupEnr = middleware(this.historyLookupEnr.bind(this), 1, [[validators.dstId]])
    this.stateLookupEnr = middleware(this.stateLookupEnr.bind(this), 1, [[validators.dstId]])
    this.beaconLookupEnr = middleware(this.beaconLookupEnr.bind(this), 1, [[validators.dstId]])

    // portal_*AddEnr
    this.historyAddEnr = middleware(this.historyAddEnr.bind(this), 1, [[validators.enr]])
    this.stateAddEnr = middleware(this.stateAddEnr.bind(this), 1, [[validators.enr]])
    this.beaconAddEnr = middleware(this.beaconAddEnr.bind(this), 1, [[validators.enr]])

    // portal_*GetEnr
    this.historyGetEnr = middleware(this.historyGetEnr.bind(this), 1, [[validators.dstId]])
    this.stateGetEnr = middleware(this.stateGetEnr.bind(this), 1, [[validators.dstId]])
    this.beaconGetEnr = middleware(this.beaconGetEnr.bind(this), 1, [[validators.dstId]])

    // portal_*DeleteEnr
    this.historyDeleteEnr = middleware(this.historyDeleteEnr.bind(this), 1, [[validators.dstId]])
    this.stateDeleteEnr = middleware(this.stateDeleteEnr.bind(this), 1, [[validators.dstId]])
    this.beaconDeleteEnr = middleware(this.beaconDeleteEnr.bind(this), 1, [[validators.dstId]])

    // portal_*AddBootNode
    this.historyAddBootNode = middleware(this.historyAddBootNode.bind(this), 1, [[validators.enr]])
    this.beaconAddBootNode = middleware(this.beaconAddBootNode.bind(this), 1, [[validators.enr]])

    // portal_*AddEnrs
    this.historyAddEnrs = middleware(this.historyAddEnrs.bind(this), 1, [
      [validators.array(validators.enr)],
    ])
    this.stateAddEnrs = middleware(this.stateAddEnrs.bind(this), 1, [
      [validators.array(validators.enr)],
    ])

    // portal_*Ping
    this.historyPing = middleware(callWithStackTrace(this.historyPing.bind(this), true), 2, [
      [validators.enr],
      [validators.extension],
      [validators.optional(validators.payload)],
    ])
    this.statePing = middleware(this.statePing.bind(this), 2, [
      [validators.enr],
      [validators.extension],
      [validators.optional(validators.payload)],
    ])
    this.beaconPing = middleware(this.beaconPing.bind(this), 2, [
      [validators.enr],
      [validators.extension],
      [validators.optional(validators.payload)],
    ])

    // portal_*FindNodes
    this.historyFindNodes = middleware(this.historyFindNodes.bind(this), 2, [
      [validators.enr],
      [validators.array(validators.distance)],
    ])
    this.stateFindNodes = middleware(this.stateFindNodes.bind(this), 2, [
      [validators.enr],
      [validators.array(validators.distance)],
    ])
    this.beaconFindNodes = middleware(this.beaconFindNodes.bind(this), 2, [
      [validators.enr],
      [validators.array(validators.distance)],
    ])

    // portal_*RecursiveFindNodes
    this.historyRecursiveFindNodes = middleware(this.historyRecursiveFindNodes.bind(this), 1, [
      [validators.dstId],
    ])
    this.stateRecursiveFindNodes = middleware(this.stateRecursiveFindNodes.bind(this), 1, [
      [validators.dstId],
    ])
    this.beaconRecursiveFindNodes = middleware(this.beaconRecursiveFindNodes.bind(this), 1, [
      [validators.dstId],
    ])

    // portal_*LocalContent
    this.historyLocalContent = middleware(this.historyLocalContent.bind(this), 1, [
      [validators.hex],
    ])
    this.beaconLocalContent = middleware(this.beaconLocalContent.bind(this), 1, [[validators.hex]])
    this.stateLocalContent = middleware(this.stateLocalContent.bind(this), 1, [[validators.hex]])

    // portal_*Store
    this.historyStore = middleware(this.historyStore.bind(this), 2, [
      [validators.contentKey],
      [validators.hex],
    ])
    this.stateStore = middleware(this.stateStore.bind(this), 2, [
      [validators.hex],
      [validators.hex],
    ])
    this.beaconStore = middleware(this.beaconStore.bind(this), 2, [
      [validators.hex],
      [validators.hex],
    ])
    // portal_*PutContent
    this.historyPutContent = middleware(this.historyPutContent.bind(this), 2, [
      [validators.contentKey],
      [validators.hex],
    ])
    this.statePutContent = middleware(this.statePutContent.bind(this), 2, [
      [validators.hex],
      [validators.hex],
    ])
    this.beaconPutContent = middleware(this.beaconPutContent.bind(this), 2, [
      [validators.hex],
      [validators.hex],
    ])

    // portal_*FindContent
    this.historyFindContent = middleware(this.historyFindContent.bind(this), 2, [
      [validators.enr],
      [validators.hex],
    ])
    this.stateFindContent = middleware(this.stateFindContent.bind(this), 2, [
      [validators.enr],
      [validators.hex],
    ])
    this.beaconFindContent = middleware(this.beaconFindContent.bind(this), 2, [
      [validators.enr],
      [validators.hex],
    ])

    // portal_*GetContent
    this.historyGetContent = middleware(this.historyGetContent.bind(this), 1, [
      [validators.contentKey],
    ])
    this.stateGetContent = middleware(this.stateGetContent.bind(this), 1, [[validators.contentKey]])
    this.beaconGetContent = middleware(this.beaconGetContent.bind(this), 1, [
      [validators.contentKey],
    ])

    // portal_*TraceGetContent
    this.historyTraceGetContent = middleware(
      callWithStackTrace(this.historyTraceGetContent.bind(this), true),
      1,
      [[validators.hex]],
    )
    this.beaconTraceGetContent = middleware(
      callWithStackTrace(this.beaconTraceGetContent.bind(this), true),
      1,
      [[validators.hex]],
    )
    this.stateTraceGetContent = middleware(
      callWithStackTrace(this.stateTraceGetContent.bind(this), true),
      1,
      [[validators.hex]],
    )

    // portal_*Offer
    this.historyOffer = middleware(this.historyOffer.bind(this), 2, [
      [validators.enr],
      [content_params.ContentItems],
    ])
    this.stateOffer = middleware(this.stateOffer.bind(this), 2, [
      [validators.enr],
      [content_params.ContentItems],
    ])
    this.beaconOffer = middleware(this.beaconOffer.bind(this), 2, [
      [validators.enr],
      [content_params.ContentItems],
    ])

    // portal_*Gossip
    this.historyGossip = middleware(this.historyGossip.bind(this), 2, [
      [validators.contentKey],
      [validators.hex],
    ])
    this.stateGossip = middleware(this.stateGossip.bind(this), 2, [
      [validators.hex],
      [validators.hex],
    ])

    this.beaconStartLightClient = middleware(this.beaconStartLightClient.bind(this), 1, [
      [validators.hex],
    ])

    this.beaconOptimisticStateRoot = middleware(this.beaconOptimisticStateRoot.bind(this), 0, [])
    this.beaconFinalizedStateRoot = middleware(this.beaconFinalizedStateRoot.bind(this), 0, [])
  }

  async methods() {
    return methods
  }

  // portal_*NodeInfo
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

  async historyRoutingTableENRs(_params: []): Promise<any> {
    this.logger(`portal_historyRoutingTableENRS request received.`)
    const { buckets } = await this._history.routingTableInfo()
    return {
      buckets: buckets.map((bucket) =>
        bucket.values().map((enr: ENR) => {
          return {
            enr: enr.encodeTxt(),
            radius: bigIntToHex(this._history.routingTable.getRadius(enr.nodeId) ?? 0n),
          }
        }),
      ),
    }
  }
  // portal_*RoutingTableInfo
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
  // portal_*LookupEnr
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
  // portal_*AddEnr
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

  // portal_*GetEnr
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

  // portal_*DeleteEnr
  async historyDeleteEnr(params: [string]): Promise<boolean> {
    const [nodeId] = params
    this.logger(`portal_historyDeleteEnr request received for ${nodeId.slice(0, 10)}...`)
    const remove = this._history.routingTable.removeById(nodeId)
    return remove !== undefined
  }
  async stateDeleteEnr(params: [string]): Promise<boolean> {
    const [nodeId] = params
    this.logger(`portal_stateDeleteEnr request received for ${nodeId.slice(0, 10)}...`)
    const remove = this._state.routingTable.removeById(nodeId)
    return remove !== undefined
  }
  async beaconDeleteEnr(params: [string]): Promise<boolean> {
    const [nodeId] = params
    this.logger(`portal_beaconDeleteEnr request received for ${nodeId.slice(0, 10)}...`)
    const remove = this._beacon.routingTable.removeById(nodeId)
    return remove !== undefined
  }

  // portal_*AddBootNode
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

  // portal_*AddEnrs
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
  // portal_*Ping
  async historyPing(params: [string, number, object | undefined]) {
    const [enr, ext, payload] = params
    const encodedENR = ENR.decodeTxt(enr)
    const extension = ext ?? 0
    this.logger(
      `PING request received on HistoryNetwork for ${shortId(encodedENR.nodeId)} with extension ${extension}`,
    )

    let encodedPayload = undefined
    if (payload !== undefined) {
      encodedPayload = encodeExtensionPayload(extension, payload)
    }
    const pong = await this._history.sendPing(encodedENR, extension, encodedPayload)
    if (pong) {
      this.logger(`PING/PONG successful with ${encodedENR.nodeId}`)
      return {
        enrSeq: Number(pong.enrSeq),
        payloadType: pong.payloadType,
        payload: decodeExtensionPayloadToJson(pong.payloadType, pong.customPayload),
      }
    } else {
      this.logger(`PING/PONG with ${encodedENR.nodeId} was unsuccessful`)
      return false
    }
  }
  async statePing(params: [string, number, object | undefined]) {
    const [enr, ext, payload] = params
    const encodedENR = ENR.decodeTxt(enr)
    const extension = ext ?? 0
    this.logger(
      `PING request received on StateNetwork for ${shortId(encodedENR.nodeId)} with extension ${extension}`,
    )
    let encodedPayload = undefined
    if (payload !== undefined) {
      encodedPayload = encodeExtensionPayload(extension, payload)
    }
    const pong = await this._state.sendPing(encodedENR, extension, encodedPayload)
    if (pong) {
      this.logger(`PING/PONG successful with ${encodedENR.nodeId}`)

      return {
        enrSeq: Number(pong.enrSeq),
        payloadType: pong.payloadType,
        payload: decodeExtensionPayloadToJson(pong.payloadType, pong.customPayload),
      }
    } else {
      this.logger(`PING/PONG with ${encodedENR.nodeId} was unsuccessful`)
      return false
    }
  }
  async beaconPing(params: [string, number, object | undefined]) {
    const [enr, ext, payload] = params
    const encodedENR = ENR.decodeTxt(enr)
    const extension = ext ?? 0
    this.logger(
      `PING request received on BeaconNetwork for ${shortId(encodedENR.nodeId)} with extension ${extension}`,
    )

    let encodedPayload = undefined
    if (payload !== undefined) {
      encodedPayload = encodeExtensionPayload(extension, payload)
    }

    const pong = await this._beacon.sendPing(encodedENR, extension, encodedPayload)
    if (pong) {
      this.logger(`PING/PONG successful with ${encodedENR.nodeId}`)
      return {
        enrSeq: Number(pong.enrSeq),
        payloadType: pong.payloadType,
        payload: decodeExtensionPayloadToJson(pong.payloadType, pong.customPayload),
      }
    } else {
      this.logger(`PING/PONG with ${encodedENR.nodeId} was unsuccessful`)
      return false
    }
  }

  // portal_*FindNodes
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
    const res = await this._history.sendFindNodes(ENR.decodeTxt(enr), distances)
    if (!res) {
      return []
    }
    const enrs = res?.enrs.map((v) => ENR.decode(v).encodeTxt())
    this.logger(`findNodes request returned ${enrs.length} enrs:`)
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
    const res = await this._state.sendFindNodes(ENR.decodeTxt(enr), distances)
    if (!res) {
      return []
    }
    const enrs = res?.enrs.map((v) => ENR.decode(v).encodeTxt())
    this.logger(`stateFindNodes request returned ${enrs.length} enrs:`)
    return res?.enrs.map((v) => ENR.decode(v).encodeTxt())
  }
  async beaconFindNodes(params: [string, number[]]) {
    const [enr, distances] = params
    const dstId = ENR.decodeTxt(enr).nodeId
    this.logger(`beaconFindNodes request received with these distances [${distances.toString()}]`)
    this.logger(`sending beaconFindNodes request to ${shortId(dstId)}`)
    if (!isValidId(dstId)) {
      return {
        code: INVALID_PARAMS,
        message: 'invalid node id',
      }
    }
    const res = await this._beacon.sendFindNodes(ENR.decodeTxt(enr), distances)
    if (!res) {
      return []
    }
    const enrs = res?.enrs.map((v) => ENR.decode(v).encodeTxt())
    this.logger(`beaconFindNodes request returned ${enrs.length} enrs:`)
    return res?.enrs.map((v) => ENR.decode(v).encodeTxt())
  }

  // portal_*RecursiveFindNodes
  async historyRecursiveFindNodes(params: [string]): Promise<string[]> {
    const [dstId] = params
    this.logger(`historyRecursiveFindNodes request received for ${dstId}`)
    const target = dstId.startsWith('0x') ? dstId.slice(2) : dstId
    const lookup = new NodeLookup(this._history, target)
    const enrs = await lookup.startLookup()
    this.logger(`historyRecursiveFindNodes request returned ${enrs.length} enrs`)
    return enrs
  }
  async stateRecursiveFindNodes(params: [string]) {
    const [dstId] = params
    this.logger(`stateRecursiveFindNodes request received for ${dstId}`)
    const target = dstId.startsWith('0x') ? dstId.slice(2) : dstId
    const lookup = new NodeLookup(this._state, target)
    const enrs = await lookup.startLookup()
    this.logger(`stateRecursiveFindNodes request returned ${enrs.length} enrs`)
    return enrs
  }
  async beaconRecursiveFindNodes(params: [string]) {
    const [dstId] = params
    this.logger(`beaconRecursiveFindNodes request received for ${dstId}`)
    const target = dstId.startsWith('0x') ? dstId.slice(2) : dstId
    const lookup = new NodeLookup(this._beacon, target)
    const enrs = await lookup.startLookup()
    this.logger(`beaconRecursiveFindNodes request returned ${enrs.length} enrs`)
    return enrs
  }

  // portal_*LocalContent
  async historyLocalContent(params: [string]): Promise<string | undefined> {
    const [contentKey] = params
    this.logger(`Received historyLocalContent request for ${contentKey}`)

    const res = await this._history.findContentLocally(hexToBytes(contentKey))
    this.logger.extend(`historyLocalContent`)(
      `request returned ${res !== undefined ? res.length : 'null'} bytes`,
    )
    this.logger.extend(`historyLocalContent`)(
      `${res !== undefined ? short(bytesToHex(res)) : 'content not found'}`,
    )
    if (res === undefined) {
      throw {
        code: -32009,
        message: 'no content found',
      }
    }
    return bytesToHex(res)
  }
  async stateLocalContent(params: [string]): Promise<string | undefined> {
    const [contentKey] = params
    this.logger(`Received stateLocalContent request for ${contentKey}`)

    const res = await this._state.findContentLocally(hexToBytes(contentKey))
    this.logger.extend(`stateLocalContent`)(`request returned ${res?.length} bytes`)
    this.logger.extend(`stateLocalContent`)(
      `${res !== undefined ? bytesToHex(res) : 'content not found'}`,
    )
    if (res === undefined) {
      throw {
        code: -32009,
        message: 'no content found',
      }
    }
    return bytesToHex(res)
  }
  async beaconLocalContent(params: [string]) {
    const [contentKey] = params
    this.logger.extend(`beaconLocalContent`)(`Received request for ${contentKey}`)

    const content = await this._beacon.findContentLocally(hexToBytes(contentKey))
    this.logger.extend(`beaconLocalContent`)(
      `request returned ${content !== undefined ? content.length : 'null'} bytes`,
    )
    this.logger.extend(`beaconLocalContent`)(
      `retrieved content: ${content !== undefined ? short(bytesToHex(content)) : 'content not found'}`,
    )
    if (content !== undefined) return bytesToHex(content)
    throw {
      code: -32009,
      message: 'no content found',
    }
  }

  // portal_*Store
  async historyStore(params: [string, string]) {
    const [contentKey, content] = params.map((param) => hexToBytes(param))
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
      const contentKeyBytes = hexToBytes(contentKey)
      await this._state.store(contentKeyBytes, hexToBytes(content))
      this.logger(`stored ${contentKey} in state network db`)
      return true
    } catch {
      this.logger(`stateStore failed for ${contentKey}`)
      return false
    }
  }
  async beaconStore(params: [string, string]) {
    const [contentKey, content] = params.map((param) => hexToBytes(param))
    try {
      await this._beacon.store(contentKey, content)
      return true
    } catch (e) {
      console.log(e)
      return false
    }
  }
  // portal_*PutContent
  async historyPutContent(params: [string, string]) {
    const [contentKey, content] = params.map((param) => hexToBytes(param))
    const contentId = this._history.contentKeyToId(contentKey)
    const d = distance(contentId, this._client.discv5.enr.nodeId)
    let storedLocally = false
    try {
      if (d <= this._history.nodeRadius) {
        await this._history.store(contentKey, content)
        storedLocally = true
      }
      const peerCount = await this._history.gossipContent(contentKey, content)
      return {
        peerCount,
        storedLocally,
      }
    } catch {
      return {
        peerCount: 0,
        storedLocally,
      }
    }
  }
  async statePutContent(params: [string, string]) {
    const [contentKey, content] = params.map((param) => hexToBytes(param))
    const contentId = this._state.contentKeyToId(contentKey)
    const d = distance(contentId, this._client.discv5.enr.nodeId)
    let storedLocally = false
    try {
      if (d <= this._state.nodeRadius) {
        await this._state.store(contentKey, content)
        storedLocally = true
      }
      const peerCount = await this._state.gossipContent(contentKey, content)
      return {
        peerCount,
        storedLocally,
      }
    } catch {
      return {
        peerCount: 0,
        storedLocally,
      }
    }
  }
  async beaconPutContent(params: [string, string]) {
    const [contentKey, content] = params.map((param) => hexToBytes(param))
    const contentId = this._beacon.contentKeyToId(contentKey)
    const d = distance(contentId, this._client.discv5.enr.nodeId)
    let storedLocally = false
    try {
      if (d <= this._beacon.nodeRadius) {
        await this._beacon.store(contentKey, content)
        storedLocally = true
      }
      const peerCount = await this._beacon.gossipContent(contentKey, content)
      return {
        peerCount,
        storedLocally,
      }
    } catch {
      return {
        peerCount: 0,
        storedLocally,
      }
    }
  }

  // portal_*FindContent
  async historyFindContent(params: [string, string]) {
    const [enr, contentKey] = params
    const nodeId = ENR.decodeTxt(enr).nodeId
    this.logger.extend('findContent')(
      `received request to send request to ${shortId(nodeId)} for contentKey ${contentKey}`,
    )
    const res = await this._history.sendFindContent(ENR.decodeTxt(enr), hexToBytes(contentKey))
    if (res === undefined) {
      this.logger.extend('findContent')(`request returned undefined`)
      return undefined
    }
    const resType =
      'enrs' in res ? FoundContent.ENRS : res.utp === true ? FoundContent.UTP : FoundContent.CONTENT
    this.logger.extend('findContent')(`request returned type: ${FoundContent[resType]}`)

    let returnValue
    if ('enrs' in res) {
      returnValue = { enrs: res.enrs.map((v: Uint8Array) => ENR.decode(v).encodeTxt()) }
    } else {
      returnValue = {
        content: res.content.length > 0 ? bytesToHex(res.content) : '0x',
        utpTransfer: res.utp,
      }
    }
    return returnValue
  }
  async stateFindContent(params: [string, string]) {
    const [enr, contentKey] = params
    const nodeId = ENR.decodeTxt(enr).nodeId
    if (!this._state.routingTable.getWithPending(nodeId)?.value) {
      const pong = await this._state.sendPing(ENR.decodeTxt(enr))
      if (!pong) {
        return ''
      }
    }
    this.logger.extend('findContent')(
      `received request to send request to ${shortId(nodeId)} for contentKey ${contentKey}`,
    )
    const res = await this._state.sendFindContent(ENR.decodeTxt(enr), hexToBytes(contentKey))
    if (res === undefined) {
      this.logger.extend('findContent')(`request returned type: ENRS`)
      return { enrs: [] }
    }
    const resType =
      'enrs' in res ? FoundContent.ENRS : res.utp === true ? FoundContent.UTP : FoundContent.CONTENT
    this.logger.extend('findContent')(`request returned type: ${FoundContent[resType]}`)

    let returnValue
    if ('enrs' in res) {
      returnValue = { enrs: res.enrs.map((v: Uint8Array) => ENR.decode(v).encodeTxt()) }
    } else {
      returnValue = {
        content: res.content.length > 0 ? bytesToHex(res.content) : '0x',
        utpTransfer: res.utp,
      }
    }
    return returnValue
  }
  async beaconFindContent(params: [string, string]) {
    const [enr, contentKey] = params
    const nodeId = ENR.decodeTxt(enr).nodeId
    this.logger.extend('findContent')(
      `received request to send request to ${shortId(nodeId)} for contentKey ${contentKey}`,
    )
    if (!this._beacon.routingTable.getWithPending(nodeId)?.value) {
      const pong = await this._beacon.sendPing(ENR.decodeTxt(enr))
      if (!pong) {
        return ''
      }
    }

    const res = await this._beacon.sendFindContent(ENR.decodeTxt(enr), hexToBytes(contentKey))

    if (res === undefined) {
      this.logger.extend('findContent')(`request returned type: ENRS`)
      return { enrs: [] }
    }
    const resType =
      'enrs' in res ? FoundContent.ENRS : res.utp === true ? FoundContent.UTP : FoundContent.CONTENT
    this.logger.extend('findContent')(`request returned type: ${FoundContent[resType]}`)

    let returnValue
    if ('enrs' in res) {
      returnValue = { enrs: res.enrs.map((v: Uint8Array) => ENR.decode(v).encodeTxt()) }
    } else {
      returnValue = {
        content: res.content.length > 0 ? bytesToHex(res.content) : '0x',
        utpTransfer: res.utp,
      }
    }
    return returnValue
  }

  // portal_*GetContent
  async historyGetContent(params: [string]) {
    const [contentKey] = params
    this.logger.extend('historyGetContent')(`request received for ${contentKey}`)
    const lookup = new ContentLookup(this._history, hexToBytes(contentKey))
    const res = await lookup.startLookup()
    if (res === undefined) {
      this.logger.extend('historyGetContent')(`request returned { enrs: [] }`)
      throw new Error('No content found')
    }
    if ('enrs' in res) {
      this.logger.extend('historyGetContent')(
        `request returned { enrs: [{${{ enrs: res.enrs.map(bytesToHex) }}}] }`,
      )
      if (res.enrs.length === 0) {
        throw new Error('No content found')
      }
      return { enrs: res.enrs.map(bytesToHex) }
    } else {
      this.logger.extend('historyGetContent')(
        `request returned { content: ${short(bytesToHex(res.content))}, utpTransfer: ${res.utp} }`,
      )
      return {
        content: bytesToHex(res.content),
        utpTransfer: res.utp,
      }
    }
  }
  async stateGetContent(params: [string]) {
    const [contentKey] = params
    this.logger.extend('stateGetContent')(`request received for ${contentKey}`)
    const lookup = new ContentLookup(this._state, hexToBytes(contentKey))
    const res = await lookup.startLookup()
    if (!res) {
      this.logger.extend('stateGetContent')(`request returned { enrs: [] }`)
      throw new Error('No content found')
    }
    if ('enrs' in res) {
      this.logger.extend('stateGetContent')(
        `request returned { enrs: [{${{ enrs: res.enrs.map(bytesToHex) }}}] }`,
      )
      if (res.enrs.length === 0) {
        throw new Error('No content found')
      }
      return { enrs: res.enrs.map(bytesToHex) }
    } else {
      this.logger.extend('stateGetContent')(
        `request returned { content: ${bytesToHex(res.content)}, utpTransfer: ${res.utp} }`,
      )
      return {
        content: bytesToHex(res.content),
        utpTransfer: res.utp,
      }
    }
  }
  async beaconGetContent(params: [string]) {
    const [contentKey] = params
    this.logger.extend('beaconGetContent')(`request received for ${contentKey}`)
    const lookup = new ContentLookup(this._beacon, hexToBytes(contentKey))
    const res = await lookup.startLookup()
    this.logger.extend('beaconGetContent')(`request returned ${JSON.stringify(res)}`)
    if (!res) {
      this.logger.extend('beaconGetContent')(`request returned { enrs: [] }`)
      throw new Error('No content found')
    }
    if ('enrs' in res) {
      this.logger.extend('beaconGetContent')(
        `request returned { enrs: [{${{ enrs: res.enrs.map(bytesToHex) }}}] }`,
      )
      if (res.enrs.length === 0) {
        throw new Error('No content found')
      }
      return { enrs: res.enrs.map(bytesToHex) }
    } else {
      this.logger.extend('beaconGetContent')(
        `request returned { content: ${bytesToHex(res.content)}, utpTransfer: ${res.utp} }`,
      )
      return {
        content: bytesToHex(res.content),
        utpTransfer: res.utp,
      }
    }
  }

  // portal_*TraceGetContent
  async historyTraceGetContent(params: [string]) {
    const [contentKey] = params
    this.logger.extend('historyTraceGetContent')(`request received for ${contentKey}`)
    const lookup = new ContentLookup(this._history, hexToBytes(contentKey), true)
    const res = await lookup.startLookup()
    this.logger.extend('historyTraceGetContent')(`request returned ${JSON.stringify(res)}`)
    if (!res) {
      this.logger.extend('historyTraceGetContent')(`request returned nothing`)
      throw new Error('No content found')
    }
    if (!('content' in res)) {
      this.logger.extend('historyTraceGetContent')(`request found no content }`)
      const error = {
        code: CONTENT_NOT_FOUND,
        trace: res.trace,
      }
      throw error
    } else {
      this.logger.extend('historyTraceGetContent')(
        `request returned { content: ${bytesToHex(res.content)}, utpTransfer: ${res.utp} }`,
      )
      this.logger.extend('historyTraceGetContent')(res.trace)
      return {
        content: bytesToHex(res.content),
        utpTransfer: res.utp,
        trace: res.trace,
      }
    }
  }
  async beaconTraceGetContent(params: [string]) {
    const [contentKey] = params
    this.logger.extend('beaconTraceGetContent')(`request received for ${contentKey}`)
    const lookup = new ContentLookup(this._history, hexToBytes(contentKey), true)
    const res = await lookup.startLookup()
    this.logger.extend('beaconTraceGetContent')(`request returned ${JSON.stringify(res)}`)
    if (!res) {
      this.logger.extend('beaconTraceGetContent')(`request returned { enrs: [] }`)
      throw new Error('No content found')
    }
    if (!('content' in res)) {
      this.logger.extend('beaconTraceGetContent')(`request found no content }`)
      const error = {
        code: CONTENT_NOT_FOUND,
        trace: res.trace,
      }
      throw error
    } else {
      this.logger.extend('beaconTraceGetContent')(
        `request returned { content: ${bytesToHex(res.content)}, utpTransfer: ${res.utp} }`,
      )
      this.logger.extend('beaconTraceGetContent')(res.trace)
      return {
        content: bytesToHex(res.content),
        utpTransfer: res.utp,
        trace: res.trace,
      }
    }
  }
  async stateTraceGetContent(params: [string]) {
    const [contentKey] = params
    this.logger.extend('stateTraceGetContent')(`request received for ${contentKey}`)
    const lookup = new ContentLookup(this._history, hexToBytes(contentKey), true)
    const res = await lookup.startLookup()
    this.logger.extend('stateTraceGetContent')(`request returned ${JSON.stringify(res)}`)
    if (!res) {
      this.logger.extend('stateTraceGetContent')(`request returned { enrs: [] }`)
      throw new Error('No content found')
    }
    if (!('content' in res)) {
      this.logger.extend('stateTraceGetContent')(`request found no content }`)
      const error = {
        code: CONTENT_NOT_FOUND,
        trace: res.trace,
      }
      throw error
    } else {
      this.logger.extend('stateTraceGetContent')(
        `request returned { content: ${bytesToHex(res.content)}, utpTransfer: ${res.utp} }`,
      )
      this.logger.extend('stateTraceGetContent')(res.trace)
      return {
        content: bytesToHex(res.content),
        utpTransfer: res.utp,
        trace: res.trace,
      }
    }
  }

  // portal_*Offer
  async historyOffer(
    params: [string, [string, string][]],
  ): Promise<string | ReturnType<typeof this._history.sendOffer>> {
    const [enrHex, contentItems] = params
    const contentKeys = contentItems.map((item) => hexToBytes(item[0]))
    const contentValues = contentItems.map((item) => hexToBytes(item[1]))
    const enr = ENR.decodeTxt(enrHex)
    if (this._history.routingTable.getWithPending(enr.nodeId)?.value === undefined) {
      const res = await this._history.sendPing(enr)
      if (res === undefined) {
        return '0x'
      }
    }
    const res = await this._history.sendOffer(enr, contentKeys, contentValues)
    return res
  }
  async stateOffer(
    params: [string, [string, string][]],
  ): Promise<string | ReturnType<typeof this._state.sendOffer>> {
    const [enrHex, contentItems] = params
    const contentKeys = contentItems.map((item) => hexToBytes(item[0]))
    const contentValues = contentItems.map((item) => hexToBytes(item[1]))
    const enr = ENR.decodeTxt(enrHex)
    if (this._state.routingTable.getWithPending(enr.nodeId)?.value === undefined) {
      const res = await this._state.sendPing(enr)
      if (res === undefined) {
        return '0x'
      }
    }
    const res = await this._state.sendOffer(enr, contentKeys, contentValues)
    return res
  }
  async beaconOffer(
    params: [string, [string, string][]],
  ): Promise<string | ReturnType<typeof this._beacon.sendOffer>> {
    const [enrHex, contentItems] = params
    const contentKeys = contentItems.map((item) => hexToBytes(item[0]))
    const contentValues = contentItems.map((item) => hexToBytes(item[1]))
    const enr = ENR.decodeTxt(enrHex)
    if (this._beacon.routingTable.getWithPending(enr.nodeId)?.value === undefined) {
      const res = await this._beacon.sendPing(enr)
      if (res === undefined) {
        return '0x'
      }
    }
    const res = await this._beacon.sendOffer(enr, contentKeys, contentValues)
    return res
  }

  // portal_*Gossip
  async historyGossip(params: [string, string]) {
    const [contentKey, content] = params
    this.logger(`historyGossip request received for ${contentKey}`)
    const res = await this._history.gossipContent(hexToBytes(contentKey), hexToBytes(content))
    return res
  }
  async stateGossip(params: [string, string]) {
    const [contentKey, content] = params
    this.logger(`stateGossip request received for ${contentKey}`)
    const res = await this._state.gossipContent(hexToBytes(contentKey), hexToBytes(content))
    return res
  }

  // other

  async beaconOptimisticStateRoot(): Promise<string> {
    this.logger(`beaconOptimisticStateRoot request received`)
    if (
      this._beacon.lightClient?.status === RunStatusCode.uninitialized ||
      this._beacon.lightClient?.status === RunStatusCode.stopped
    ) {
      const error = {
        code: BEACON_CLIENT_NOT_INITIALIZED,
        message: 'beacon client not initialized',
      }
      throw error
    }
    const res = this._beacon.lightClient?.getHead()
    this.logger(
      `beaconOptimisticStateRoot request returned ${res !== undefined ? bytesToHex(res?.beacon.stateRoot) : '0x'}`,
    )
    return res !== undefined ? bytesToHex(res?.beacon.stateRoot) : '0x'
  }

  async beaconFinalizedStateRoot(): Promise<string> {
    this.logger(`beaconFinalizedStateRoot request received`)
    if (
      this._beacon.lightClient?.status === RunStatusCode.uninitialized ||
      this._beacon.lightClient?.status === RunStatusCode.stopped
    ) {
      const error = {
        code: BEACON_CLIENT_NOT_INITIALIZED,
        message: 'beacon client not initialized',
      }
      throw error
    }
    const res = this._beacon.lightClient?.getFinalized()
    this.logger(
      `beaconFinalizedStateRoot request returned ${res !== undefined ? bytesToHex(res?.beacon.stateRoot) : '0x'}`,
    )
    return res !== undefined ? bytesToHex(res?.beacon.stateRoot) : '0x'
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
}
