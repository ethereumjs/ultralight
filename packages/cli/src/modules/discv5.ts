import { Debugger } from 'debug'
import { PortalNetwork } from 'portalnetwork'
import { middleware, validators } from '../validators.js'
import * as schema from '../schema/index.js'

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
  }
  async discv5_nodeInfo(params: []) {}
  async discv5_updateNodeInfo(params: [string, boolean | undefined]) {}
  async discv5_routingTableInfo(params: []) {}
  async discv5_addEnr(params: [string]) {}
  async discv5_getEnr(params: [string]) {}
  async discv5_deleteEnr(params: [string]) {}
  async discv5_lookupEnr(params: [string, number]) {}
  async discv5_sendPing(params: [string]) {}
  async discv5_sendPong(params: [string, number]) {}
  async discv5_sendFindNode(params: [string, number[]]) {}
  async discv5_sendNodes(params: [string, string[], number]) {}
  async discv5_sendTalkRequest(params: [string, number, string]) {}
  async discv5_sendTalkResponse(params: [string, string, number]) {}
  async discv5_ping(params: [string]) {}
  async discv5_findNode(params: [string, number[]]) {}
  async discv5_talkReq(params: [string, string, string]) {}
  async discv5_recursiveFindNode(params: [string]) {}
}
