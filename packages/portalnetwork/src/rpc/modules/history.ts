import { Debugger } from 'debug'
import { PortalNetwork } from '../../index.js'
import { isValidId } from '../util.js'
import { middleware, validators } from '../validators.js'

const portal_history_methods = [
  'portal_historyAccept',
  'portal_historySendAccept',
  'portal_historyAddEnr',
  'portal_historyGetEnr',
  'portal_historyDeleteEnr',
  'portal_historyLookupEnr',
  'portal_historySendPing',
  'portal_historySendPong',
  'portal_historySendFindNodes',
  'portal_historySendNodes',
  'portal_historyPing',
  'portal_historyFindNodes',
  'portal_historyRecursiveFindNodes',
  'portal_historyRoutingTableInfo',
  'portal_historyFindContent',
  'portal_historyRecursiveFindContent',
  'portal_historySendFindContent',
  'portal_historyContent',
  'portal_historySendContent',
  'portal_historyOffer',
  'portal_historySendOffer',
  'portal_historyStore',
]

export class portal_history {
  private _client: PortalNetwork
  private logger: Debugger

  constructor(client: PortalNetwork, logger: Debugger) {
    this._client = client
    this.logger = logger
    this.Accept = middleware(this.Accept.bind(this), 0, [])
    this.SendAccept = middleware(this.SendAccept.bind(this), 0, [])
    this.AddEnr = middleware(this.AddEnr.bind(this), 0, [])
    this.GetEnr = middleware(this.GetEnr.bind(this), 0, [])
    this.DeleteEnr = middleware(this.DeleteEnr.bind(this), 0, [])
    this.LookupEnr = middleware(this.LookupEnr.bind(this), 0, [])
    this.SendPing = middleware(this.SendPing.bind(this), 0, [])
    this.SendPong = middleware(this.SendPong.bind(this), 0, [])
    this.SendFindNodes = middleware(this.SendFindNodes.bind(this), 0, [])
    this.SendNodes = middleware(this.SendNodes.bind(this), 0, [])
    this.Ping = middleware(this.Ping.bind(this), 0, [])
    this.FindNodes = middleware(this.FindNodes.bind(this), 0, [])
    this.RecursiveFindNodes = middleware(this.RecursiveFindNodes.bind(this), 0, [])
    this.RoutingTableInfo = middleware(this.RoutingTableInfo.bind(this), 0, [])
    this.FindContent = middleware(this.FindContent.bind(this), 0, [])
    this.RecursiveFindContent = middleware(this.RecursiveFindContent.bind(this), 0, [])
    this.SendFindContent = middleware(this.SendFindContent.bind(this), 0, [])
    this.Content = middleware(this.Content.bind(this), 0, [])
    this.SendContent = middleware(this.SendContent.bind(this), 0, [])
    this.Offer = middleware(this.Offer.bind(this), 0, [])
    this.SendOffer = middleware(this.SendOffer.bind(this), 0, [])
    this.Store = middleware(this.Store.bind(this), 0, [])
  }

  async Accept(): Promise<any> {
    return
  }
  async SendAccept(): Promise<any> {
    return
  }
  async AddEnr(): Promise<any> {
    return
  }
  async GetEnr(): Promise<any> {
    return
  }
  async DeleteEnr(): Promise<any> {
    return
  }
  async LookupEnr(): Promise<any> {
    return
  }
  async SendPing(): Promise<any> {
    return
  }
  async SendPong(): Promise<any> {
    return
  }
  async SendFindNodes(): Promise<any> {
    return
  }
  async SendNodes(): Promise<any> {
    return
  }
  async Ping(): Promise<any> {
    return
  }
  async FindNodes(): Promise<any> {
    return
  }
  async RecursiveFindNodes(): Promise<any> {
    return
  }
  async RoutingTableInfo(): Promise<any> {
    return
  }
  async FindContent(): Promise<any> {
    return
  }
  async RecursiveFindContent(): Promise<any> {
    return
  }
  async SendFindContent(): Promise<any> {
    return
  }
  async Content(): Promise<any> {
    return
  }
  async SendContent(): Promise<any> {
    return
  }
  async Offer(): Promise<any> {
    return
  }
  async SendOffer(): Promise<any> {
    return
  }
  async Store(): Promise<any> {
    return
  }
}
