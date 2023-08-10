import debug, { Debugger } from 'debug'
import { EventEmitter } from 'events'
import { Multiaddr } from '@multiformats/multiaddr'
import { IPacket } from '@chainsafe/discv5/packet'
import { IPMode, ITransportEvents, ITransportService } from '@chainsafe/discv5/lib/transport/types.js'
import StrictEventEmitter from 'strict-event-emitter-types/types/src'
import { WebSocketTransportService } from '../index.js'
import { WakuPortal } from './waku.js'
import WebRTC from './webRTC.js'
import { BaseENR, SignableENR, ISocketAddr } from '@chainsafe/discv5'
import { SocketAddress } from '@chainsafe/discv5/lib/util/ip.js'

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
  ipMode: IPMode = {
    ip4: true,
    ip6: false
  }
  bindAddrs: Multiaddr[] = []
  public nodeId: string
  public webRTC: WebRTC
  public websocket: WebSocketTransportService
  public waku: WakuPortal
  public status: 'stopped' | 'rtconly' | 'hybrid'
  public rtcEnabled: Map<string, boolean>
  private enr: SignableENR
  constructor(multiaddr: Multiaddr, enr: SignableENR, proxyAddress: string) {
    //eslint-disable-next-line constructor-super
    super()
    this.log = debug('Portal').extend('HybridTransportService')
    this.bindAddrs = [multiaddr]
    this.nodeId = enr.nodeId
    this.enr = enr
    this.waku = new WakuPortal(multiaddr, enr)
    this.webRTC = new WebRTC(this.nodeId, new WakuPortal(multiaddr, enr))
    this.websocket = new WebSocketTransportService(this.bindAddrs[0], this.nodeId, proxyAddress)
    this.status = 'stopped'
    this.rtcEnabled = new Map()
  }
  async start() {
    await this.webRTC.start()
    this.status = 'rtconly'
    try {
      await this.startWebsocket()
      this.status = 'hybrid'
    } catch {
      this.log.extend('START')('Failed to start websocket')
    }
    this.webRTC.on('packet', async (src, packet) => {
      this.rtcEnabled.set(src.toString(), true)
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
  }

  async startWebsocket() {
    await this.websocket.start()
    this.websocket.on('packet', (src, packet) => {
      this.isRTC(src) === true || this.rtcEnabled.set(src.toString(), false)
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

  isRTC(to: Multiaddr): boolean | undefined {
    return this.rtcEnabled.get(to.toString())
  }

  async send(to: Multiaddr, toId: string, packet: IPacket) {
    // If we are only using RTC, send via RTC
    if (this.status === 'rtconly') {
      try {
        await this.webRTC.send(to, toId, packet)
      } catch (e) {
        this.log.extend('SEND')('Error sending RTC: ' + (e as any).message)
      }
      // If we are also using websocket proxy...
    } else if (this.status === 'hybrid') {
      // If we have already established a connection with the peer via WAKU/WebRTC
      if (this.webRTC.getPeer(toId) || this.isRTC(to) === true) {
        this.log.extend('SEND')('Sending via RTC')
        try {
          await this.webRTC.send(to, toId, packet)
        } catch (e) {
          this.log.extend('SEND')('Error sending RTC: ' + (e as any).message)
        }
        // If we have already established a connection with the peer via Websocket
      } else if (this.isRTC(to) === false) {
        this.log.extend('SEND')('Sending via Websocket')
        try {
          await this.websocket.send(to, toId, packet)
        } catch (e) {
          this.log.extend('SEND')('Error sending Websocket: ' + (e as any).message)
        }
        // If we do not yet know how to connect to the peer
      } else {
        try {
          // Try webRTC first
          await this.webRTC.send(to, toId, packet)
          if (this.isRTC(to) === undefined) {
            // If it fails, try websocket
            await this.websocket.send(to, toId, packet)
          }
        } catch (e) {
          this.log.extend('SEND')('Error sending: ' + (e as any).message)
        }
      }
    }
  }

  async connectWebRTC(nodeId: string) {
    this.log('Initiating RTC Connection with ' + nodeId)
    await this.webRTC.handleNewMember(nodeId)
  }

  getContactableAddr(enr: BaseENR): SocketAddress | undefined {
    const nodeAddr = this.bindAddrs[0].tuples()
    return {
      port: this.bindAddrs[0].nodeAddress().port,
      ip: {
        type: 4,
        octets: nodeAddr[0][1] ?? new Uint8Array([0,0,0,0])
      }
    }
  }
}
