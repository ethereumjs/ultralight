import { Debugger } from 'debug'
import { NodeId, PortalNetwork } from 'portalnetwork'
import { middleware, validators } from '../validators.js'
import * as schema from '../schema/index.js'
import {
  AddEnrResult,
  DeleteEnrResult,
  FindNodeResult,
  Enr,
  GetEnrResult,
  isTcp,
  LookupEnrResult,
  NodeInfoResult,
  PingResult,
  RecursiveFindNodeResult,
  RoutingTableInfoResult,
  SendFindNodeResult,
  SendNodesResult,
  SendPingResult,
  SendPongResult,
  SendTalkRequestResult,
  SendTalkResponseResult,
  TalkResult,
  EnrSeq,
  Distances,
  RequestId,
  ProtocolId,
  Discv5Payload,
  socketAddr,
} from '../schema/types.js'

const methods = [
  'discv5_nodeInfo',
  'discv5_updateNodeInfo',
  'discv5_routingTableInfo',
  'discv5_addEnr',
  'discv5_getEnr',
  'discv5_deleteEnr',
  'discv5_lookupEnr',
  'discv5_sendPing',
  'discv5_sendPong',
  'discv5_sendFindNode',
  'discv5_sendNodes',
  'discv5_sendTalkRequest',
  'discv5_sendTalkResponse',
  'discv5_ping',
  'discv5_findNode',
  'discv5_talkReq',
  'discv5_recursiveFindNode',
]

export class discv5 {
  private _client: PortalNetwork
  private logger: Debugger

  constructor(client: PortalNetwork, logger: Debugger) {
    this._client = client
    this.logger = logger
    this.discv5_nodeInfo = middleware(this.discv5_nodeInfo.bind(this), 0, [])
    this.discv5_updateNodeInfo = middleware(this.discv5_updateNodeInfo.bind(this), 0, [
      [schema.portal.socketAddr],
      [schema.schema.optional(validators.bool)],
    ])
    this.discv5_routingTableInfo = middleware(this.discv5_routingTableInfo.bind(this), 1, [
      [schema.portal.Enr],
    ])
    this.discv5_addEnr = middleware(this.discv5_addEnr.bind(this), 1, [[schema.content_params.Enr]])
    this.discv5_getEnr = middleware(this.discv5_getEnr.bind(this), 1, [
      [schema.content_params.NodeId],
    ])
    this.discv5_deleteEnr = middleware(this.discv5_deleteEnr.bind(this), 1, [
      [schema.content_params.NodeId],
    ])
    this.discv5_lookupEnr = middleware(this.discv5_lookupEnr.bind(this), 2, [
      [schema.content_params.NodeId],
      [schema.content_params.RequestId],
    ])
    this.discv5_sendPing = middleware(this.discv5_sendPing.bind(this), 1, [
      [schema.content_params.EnrSeq],
    ])
    this.discv5_sendPong = middleware(this.discv5_sendPong.bind(this), 2, [
      [schema.content_params.Enr],
      [schema.content_params.RequestId],
    ])
    this.discv5_sendFindNode = middleware(this.discv5_sendFindNode.bind(this), 2, [
      [schema.content_params.Enr],
      [schema.content_params.Distances],
    ])
    this.discv5_sendNodes = middleware(this.discv5_sendNodes.bind(this), 3, [
      [schema.content_params.Enr],
      [schema.content_params.Nodes],
      [schema.content_params.RequestId],
    ])
    this.discv5_sendTalkRequest = middleware(this.discv5_sendTalkRequest.bind(this), 3, [
      [schema.content_params.Enr],
      [schema.content_params.ProtocolId],
      [schema.content_params.Discv5Payload],
    ])
    this.discv5_sendTalkResponse = middleware(this.discv5_sendTalkResponse.bind(this), 3, [
      [schema.content_params.Enr],
      [schema.content_params.Discv5Payload],
      [schema.content_params.RequestId],
    ])
    this.discv5_ping = middleware(this.discv5_ping.bind(this), 1, [[schema.content_params.Enr]])
    this.discv5_findNode = middleware(this.discv5_findNode.bind(this), 2, [
      [schema.content_params.Enr],
      [schema.content_params.Distances],
    ])
    this.discv5_talkReq = middleware(this.discv5_talkReq.bind(this), 3, [
      [schema.content_params.Enr],
      [schema.content_params.Enr],
      [schema.content_params.Discv5Payload],
    ])
    this.discv5_recursiveFindNode = middleware(this.discv5_recursiveFindNode.bind(this), 1, [
      [schema.content_params.NodeId],
    ])
  }
  /**
   * Returns ENR and nodeId information of the local discv5 node.
   * @param params an empty array
   */
  async discv5_nodeInfo(params: []): Promise<NodeInfoResult> {
    return {
      enr: this._client.discv5.enr.encodeTxt(this._client.discv5.keypair.privateKey),
      nodeId: this._client.discv5.enr.nodeId,
    }
  }

  /**
   * Add, update, or remove a key-value pair from the local node record
   * @param params An array of two parameters:
   *  1. socketAddr: ENR socket address
   *  2. *optional* isTcp: TCP or UDP socket
   */
  async discv5_updateNodeInfo(params: [socketAddr, isTcp]): Promise<NodeInfoResult> {
    return {
      enr: '',
      nodeId: '',
    }
  }

  /**
   * Returns meta information about discv5 routing table.
   * @param params an empty array
   */
  async discv5_routingTableInfo(params: []): Promise<RoutingTableInfoResult> {
    return {
      localNodeId: Number.prototype as number,
      buckets: [],
    }
  }

  /**
   * Write an ethereum node record to the routing table.
   * @param params ENR string
   */
  async discv5_addEnr(params: [Enr]): Promise<AddEnrResult> {
    return true
  }

  /**
   * Fetch the latest ENR associated with the given node ID
   * @param params NodeId string
   */
  async discv5_getEnr(params: [NodeId]): Promise<GetEnrResult> {
    return ''
  }

  /**
   * Delete a Node ID from the routing table
   * @param params NodeId string
   */
  async discv5_deleteEnr(params: [NodeId]): Promise<DeleteEnrResult> {
    return true
  }

  /**
   * Fetch the ENR representation associated with the given Node ID and optional sequence number
   * @param params An array of two parameters:
   * 1. NodeId string
   * 2. ENR Seq number
   */
  async discv5_lookupEnr(params: [NodeId, EnrSeq]): Promise<LookupEnrResult> {
    return ''
  }

  /**
   * Send a PING message to the designated node and wait for a PONG response.
   * @param params ENR string
   */
  async discv5_ping(params: [Enr]): Promise<PingResult> {
    return {
      enrSeq: 0,
      dataRadius: 0,
    }
  }

  /**
   * Send a PING message to the specified node
   * @param params An array of two parameters
   * 1. ENR string
   */
  async discv5_sendPing(params: [Enr]): Promise<SendPingResult> {
    return {
      requestId: 0,
    }
  }

  /**
   * Send a FINDNODE request to a peer, to search within the given set of distances
   * @param params An arrray of two parameters
   * 1. ENR string
   * 2. RequestId: number
   */
  async discv5_sendPong(params: [Enr, RequestId]): Promise<SendPongResult> {
    return true
  }

  /**
   * Send a FINDNODE request for nodes that fall within the given set of distances, to the designated peer and wait for a response.
   * @param params An arrray of two parameters
   * 1. ENR string
   * 2. Distances: Array of distances to search
   */
  async discv5_findNode(params: [Enr, Distances]): Promise<FindNodeResult> {
    return []
  }

  /**
   * Lookup a target node within in the network
   * @param params NodeId string
   */
  async discv5_recursiveFindNode(params: [NodeId]): Promise<RecursiveFindNodeResult> {
    return []
  }

  /**
   * Send a FINDNODE request to a peer, to search within the given set of distances
   * @param params An array of two parameters
   * 1. ENR string
   * 2. Array of distances
   */
  async discv5_sendFindNode(params: [Enr, Distances]): Promise<SendFindNodeResult> {
    return 0
  }

  /**
   * Respond to a specific FINDNODE request with a NODES response.
   * @param params An array of three parameters
   * 1. ENR string
   * 2. Array of Nodes
   * 3. RequestId
   */
  async discv5_sendNodes(params: [string, string[], number]): Promise<SendNodesResult> {
    return 0
  }

  /**
   * Send a TALKREQ request with a payload to the given peer.
   * @param params An array of three parameters
   * 1. ENR string
   * 2. ProtocolId
   * 3. Discv5Payload
   */
  async discv5_sendTalkRequest(
    params: [Enr, ProtocolId, Discv5Payload]
  ): Promise<SendTalkRequestResult> {
    return 0
  }

  /**
   * Respond to a TALKREQ request by sending a TALKRESP response.
   * @param params An array of parameters
   * 1. ENR string
   * 2. Discv5Payload
   * 3. RequestId
   */
  async discv5_sendTalkResponse(
    params: [Enr, Discv5Payload, RequestId]
  ): Promise<SendTalkResponseResult> {
    return true
  }

  /**
   * Send a TALKREQ request with a payload to a given peer and wait for response.
   * @param params An array of three parameters
   * 1. ENR string
   * 2. ENR string
   * 3. Discv5Payload
   */
  async discv5_talkReq(params: [Enr, Enr, Discv5Payload]): Promise<TalkResult> {
    return ''
  }
}
