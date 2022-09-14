import { Debugger } from 'debug'
import { PortalNetwork } from 'portalnetwork'
import { middleware } from '../validators.js'

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
    this.discv5_updateNodeInfo = middleware(this.discv5_updateNodeInfo.bind(this), 0, [])
    this.discv5_routingTableInfo = middleware(this.discv5_routingTableInfo.bind(this), 0, [])
    this.discv5_addEnr = middleware(this.discv5_addEnr.bind(this), 0, [])
    this.discv5_getEnr = middleware(this.discv5_getEnr.bind(this), 0, [])
    this.discv5_deleteEnr = middleware(this.discv5_deleteEnr.bind(this), 0, [])
    this.discv5_lookupEnr = middleware(this.discv5_lookupEnr.bind(this), 0, [])
    this.discv5_sendPing = middleware(this.discv5_sendPing.bind(this), 0, [])
    this.discv5_sendPong = middleware(this.discv5_sendPong.bind(this), 0, [])
    this.discv5_sendFindNode = middleware(this.discv5_sendFindNode.bind(this), 0, [])
    this.discv5_sendNodes = middleware(this.discv5_sendNodes.bind(this), 0, [])
    this.discv5_sendTalkRequest = middleware(this.discv5_sendTalkRequest.bind(this), 0, [])
    this.discv5_sendTalkResponse = middleware(this.discv5_sendTalkResponse.bind(this), 0, [])
    this.discv5_ping = middleware(this.discv5_ping.bind(this), 0, [])
    this.discv5_findNode = middleware(this.discv5_findNode.bind(this), 0, [])
    this.discv5_talkReq = middleware(this.discv5_talkReq.bind(this), 0, [])
    this.discv5_recursiveFindNode = middleware(this.discv5_recursiveFindNode.bind(this), 0, [])
  }
  async discv5_nodeInfo(params = []) {}
  async discv5_updateNodeInfo(params = []) {}
  async discv5_routingTableInfo(params = []) {}
  async discv5_addEnr(params = []) {}
  async discv5_getEnr(params = []) {}
  async discv5_deleteEnr(params = []) {}
  async discv5_lookupEnr(params = []) {}
  async discv5_sendPing(params = []) {}
  async discv5_sendPong(params = []) {}
  async discv5_sendFindNode(params = []) {}
  async discv5_sendNodes(params = []) {}
  async discv5_sendTalkRequest(params = []) {}
  async discv5_sendTalkResponse(params = []) {}
  async discv5_ping(params = []) {}
  async discv5_findNode(params = []) {}
  async discv5_talkReq(params = []) {}
  async discv5_recursiveFindNode(params = []) {}
}
