import { Debugger } from 'debug'
import { NodeId, PortalNetwork } from '../../index.js'
import { middleware, validators } from '../validators.js'
import * as schema from '../schema/index.js'
import {
  AddEnrResult,
  DeleteEnrResult,
  Enr,
  GetEnrResult,
  isTcp,
  LookupEnrResult,
  NodeInfoResult,
  RoutingTableInfoResult,
  EnrSeq,
  socketAddr,
} from '../schema/types.js'
import { multiaddr } from '@multiformats/multiaddr'

const methods = [
  'discv5_nodeInfo',
  'discv5_updateNodeInfo',
  'discv5_routingTableInfo',
  'discv5_addEnr',
  'discv5_getEnr',
  'discv5_deleteEnr',
  'discv5_lookupEnr',
]

export class discv5 {
  private _client: PortalNetwork
  private logger: Debugger

  constructor(client: PortalNetwork, logger: Debugger) {
    this._client = client
    this.logger = logger
    this.methods = middleware(this.methods.bind(this), 0, [])
    this.nodeInfo = middleware(this.nodeInfo.bind(this), 0, [])
    this.updateNodeInfo = middleware(this.updateNodeInfo.bind(this), 0, [
      [schema.portalSchema.socketAddr],
      [schema.schema.optional(validators.bool)],
    ])
    this.routingTableInfo = middleware(this.routingTableInfo.bind(this), 0, [])
    this.addEnr = middleware(this.addEnr.bind(this), 1, [[schema.content_params.Enr]])
    this.getEnr = middleware(this.getEnr.bind(this), 1, [[schema.content_params.NodeId]])
    this.deleteEnr = middleware(this.deleteEnr.bind(this), 1, [[schema.content_params.NodeId]])
    this.lookupEnr = middleware(this.lookupEnr.bind(this), 2, [
      [schema.content_params.NodeId],
      [schema.content_params.RequestId],
    ])
  }

  async methods(params: []): Promise<string[]> {
    return methods
  }

  /**
   * Returns ENR and nodeId information of the local discv5 node.
   * @param params an empty array
   */
  async nodeInfo(params: []): Promise<NodeInfoResult> {
    return {
      enr: this._client.discv5.enr.encodeTxt(this._client.discv5.keypair.privateKey),
      nodeId: '0x' + this._client.discv5.enr.nodeId,
    }
  }

  /**
   * Add, update, or remove a key-value pair from the local node record
   * @param params An array of two parameters:
   *  1. socketAddr: ENR socket address
   *  2. *optional* isTcp: TCP or UDP socket
   */
  async updateNodeInfo(params: [socketAddr, isTcp]): Promise<NodeInfoResult> {
    const [socketAddr, isTcp] = params
    this._client.discv5.enr.setLocationMultiaddr(multiaddr(socketAddr))
    return {
      enr: this._client.discv5.enr.encodeTxt(this._client.discv5.keypair.privateKey),
      nodeId: '0x' + this._client.discv5.enr.nodeId,
    }
  }

  /**
   * Returns meta information about discv5 routing table.
   * @param params an empty array
   */
  async routingTableInfo(params: []): Promise<RoutingTableInfoResult> {
    const buckets = (this._client.discv5 as any).kbuckets.buckets as unknown[]
    const lowToHi = buckets.map((kb: any) => kb.nodes.map((node: any) => '0x' + node.value._nodeId))
    const hiToLow = lowToHi.reverse()
    return {
      localNodeId: '0x' + this._client.discv5.enr.nodeId,
      buckets: hiToLow,
    }
  }

  /**
   * Write an ethereum node record to the routing table.
   * @param params ENR string
   */
  async addEnr(params: [Enr]): Promise<AddEnrResult> {
    const [enr] = params
    try {
      this._client.discv5.addEnr(enr)
      return true
    } catch {
      return false
    }
  }

  /**
   * Fetch the latest ENR associated with the given node ID
   * @param params NodeId string
   */
  async getEnr(params: [NodeId]): Promise<GetEnrResult> {
    const [nodeId] = params
    return this._client.discv5.findEnr(nodeId)?.encodeTxt() ?? ''
  }

  /**
   * Delete a Node ID from the routing table
   * @param params NodeId string
   */
  async deleteEnr(params: [NodeId]): Promise<DeleteEnrResult> {
    const [nodeId] = params
    const buckets = (this._client.discv5 as any).kbuckets.buckets
    for (let i = 255; i > -1; i--) {
      ;(buckets[i] as any).removeById(nodeId)
    }
    const removed = this._client.discv5.findEnr(nodeId)
    return removed === undefined ? true : false
  }

  /**
   * Fetch the ENR representation associated with the given Node ID and optional sequence number
   * @param params An array of two parameters:
   * 1. NodeId string
   * 2. ENR Seq number
   */
  async lookupEnr(params: [NodeId, EnrSeq]): Promise<LookupEnrResult> {
    const [nodeId, enrseq] = params
    return this._client.discv5.findEnr(nodeId)?.encodeTxt()
  }
}
