import debug, { Debugger } from 'debug'
import { EventEmitter } from 'events'
import { Multiaddr } from '@multiformats/multiaddr'
import { IPacket } from '@chainsafe/discv5/packet'
import { ITransportEvents, ITransportService } from '@chainsafe/discv5/lib/transport/types.js'
import StrictEventEmitter from 'strict-event-emitter-types/types/src'
import { ENR, WebSocketTransportService } from '../index.js'
import { WakuPortal } from './waku.js'
import WebRTC from './webRTC.js'

interface IHybridTransportEvents extends ITransportEvents {
  multiAddr: (src: Multiaddr) => void
  hello: (enr: string) => void
}

export declare type HybridTransportEventEmitter = StrictEventEmitter<
  EventEmitter,
  IHybridTransportEvents
>

export class HybridTransportService
  extends (EventEmitter as { new (): HybridTransportEventEmitter })
  implements ITransportService
{
  private log: Debugger
  public multiaddr: Multiaddr
  public nodeId: string
  public webRTC: WebRTC
  public websocket: WebSocketTransportService
  public waku: WakuPortal
  public status: 'started' | 'stopped'
  constructor(multiaddr: Multiaddr, enr: ENR, proxyAddress: string) {
    //eslint-disable-next-line constructor-super
    super()
    this.log = debug('Portal').extend('HybridTransportService')
    this.multiaddr = multiaddr
    this.nodeId = enr.nodeId
    this.waku = new WakuPortal(multiaddr, enr)
    this.webRTC = new WebRTC(this.nodeId, new WakuPortal(multiaddr, enr))
    this.websocket = new WebSocketTransportService(this.multiaddr, this.nodeId, proxyAddress)
    this.status = 'stopped'
  }
  async start() {
    await this.startWebsocket()
    await this.webRTC.start()
    this.webRTC.on('packet', async (src, packet) => {
      this.emit('packet', src, packet)
    })
    this.webRTC.on('decodeError', (err, src) => {
      this.emit('decodeError', err, src)
    })
    this.webRTC.on('multiAddr', (src) => {
      this.emit('multiAddr', src)
    })
    this.webRTC.on('send', (toId: string, message: string) => {
      this.waku.sendMessage(message, toId)
    })
    this.status = 'started'
  }

  async startWebsocket() {
    await this.websocket.start()
    this.websocket.on('packet', (src, packet) => {
      this.emit('packet', src, packet)
    })
    this.websocket.on('decodeError', (err, src) => {
      this.emit('decodeError', err, src)
    })
    this.websocket.on('multiAddr', (src) => {
      this.emit('multiAddr', src)
    })
  }

  async stop() {
    await this.websocket?.stop()
    this.webRTC.closeAll()
  }

  async send(to: Multiaddr, toId: string, packet: IPacket, rtc?: boolean) {
    if (rtc) {
      this.log.extend('SEND')('Sending via RTC')
      try {
        await this.webRTC.send(to, toId, packet)
      } catch (e) {
        this.log.extend('SEND')('Error sending RTC: ' + (e as any).message)
      }
    } else {
      this.log.extend('SEND')('Sending via Websocket')
      try {
        await this.websocket.send(to, toId, packet)
      } catch (e) {
        this.log.extend('SEND')('Error sending Websocket: ' + (e as any).message)
      }
    }
  }

  async connectWebRTC(nodeId: string) {
    this.log('Initiating RTC Connection with ' + nodeId)
    await this.webRTC.handleNewMember(nodeId)
  }
}
