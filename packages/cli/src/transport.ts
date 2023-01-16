import debug, { Debugger } from 'debug'
import { EventEmitter } from 'events'
import { Multiaddr } from '@multiformats/multiaddr'
import { IPacket } from '@chainsafe/discv5/packet'
import { ITransportEvents, ITransportService } from '@chainsafe/discv5'
import { StrictEventEmitter } from 'strict-event-emitter-types/types/src'
import { WakuPortal } from './waku.js'
import WebRTC from './webRTC.js'
import { ENR } from '@chainsafe/discv5'
import { UDPTransportService } from './udp.js'

interface INodeTransportEvents extends ITransportEvents {
  multiAddr: (src: Multiaddr) => void
  hello: (enr: string) => void
}
export declare type NodeTransportEventEmitter = StrictEventEmitter<
  EventEmitter,
  INodeTransportEvents
>

export class NodeTransportService
  extends (EventEmitter as { new (): NodeTransportEventEmitter })
  implements ITransportService
{
  private log: Debugger
  public multiaddr: any
  public nodeId: string
  public webRTC: WebRTC
  public udp: UDPTransportService
  public waku: WakuPortal
  public status: 'stopped' | 'rtconly' | 'hybrid' | 'udponly'
  public rtcEnabled: Map<string, boolean>
  constructor(multiaddr: any, enr: ENR) {
    //eslint-disable-next-line constructor-super
    super()
    this.log = debug('Portal').extend('HybridTransportService')
    this.multiaddr = multiaddr
    this.nodeId = enr.nodeId
    this.waku = new WakuPortal(multiaddr, enr)
    this.webRTC = new WebRTC(this.nodeId, new WakuPortal(multiaddr, enr))
    this.udp = new UDPTransportService(this.multiaddr, this.nodeId)
    this.status = 'stopped'
    this.rtcEnabled = new Map()
  }
  async start() {
    await this.webRTC.start()
    this.status = 'rtconly'
    try {
      await this.udp.start()
      this.log(`Started UDP Service: ${this.udp.multiaddr}`)
      ;(this.udp as any).on('packet', async (src: any, packet: any) => {
        this.rtcEnabled.set(src.toString(), false)
        this.emit('packet', src, packet)
      })
      ;(this.udp as any).on('decodeError', (err: any, src: any) => {
        this.emit('decodeError', err, src)
      })
      this.status = 'hybrid'
    } catch {
      this.log.extend('START')('Failed to start udp transport')
    }
    this.webRTC.on('multiAddr', (src) => {
      this.emit('multiAddr', src)
    })
    this.webRTC.on('packet', async (src, packet) => {
      this.rtcEnabled.set(src.toString(), true)
      this.emit('packet', src, packet)
    })
    this.webRTC.on('decodeError', (err, src) => {
      this.emit('decodeError', err, src)
    })
    this.webRTC.on('send', (toId: string, message: string) => {
      this.waku.sendMessage(message, toId)
    })
  }

  async stop() {
    await this.udp.stop()
    this.webRTC.closeAll()
  }

  isRTC(to: Multiaddr): boolean | undefined {
    return this.rtcEnabled.get(to.toString())
  }

  async send(to: any, toId: string, packet: IPacket) {
    // If we are only using RTC, send via RTC
    if (this.status === 'rtconly') {
      try {
        await this.webRTC.send(to, toId, packet)
      } catch (e) {
        this.log.extend('SEND')('Error sending RTC: ' + (e as any).message)
      }
      // If we are also using udp...
    } else if (this.status === 'udponly') {
      try {
        await this.udp.send(to, toId, packet)
      } catch (e) {
        this.log.extend('SEND')('Error sending UDP: ' + (e as any).message)
      }
    } else if (this.status === 'hybrid') {
      // If we have already established a connection with the peer via WAKU/WebRTC
      if (this.webRTC.getPeer(toId) || this.isRTC(to) === true) {
        try {
          await this.webRTC.send(to, toId, packet)
        } catch (e) {
          this.log.extend('SEND')('Error sending RTC: ' + (e as any).message)
        }
        // If we have already established a connection with the peer via UDP
      } else if (this.isRTC(to) === false) {
        try {
          await this.udp.send(to, toId, packet)
        } catch (e) {
          this.log.extend('SEND')('Error sending UDP: ' + (e as any).message)
        }
        // If we do not yet know how to connect to the peer
      } else {
        try {
          // Try webRTC first
          await this.webRTC.send(to, toId, packet)
          if (this.isRTC(to) === undefined) {
            // If it fails, try dup
            await this.udp.send(to, toId, packet)
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
}
