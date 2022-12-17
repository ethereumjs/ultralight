import debug, { Debugger } from 'debug'
import { EventEmitter } from 'events'
import { Multiaddr } from '@multiformats/multiaddr'
import { IPacket } from '@chainsafe/discv5/packet'
import { ITransportEvents, ITransportService } from '@chainsafe/discv5/lib/transport/types.js'
import StrictEventEmitter from 'strict-event-emitter-types/types/src'
import { WebSocketTransportService } from '../index.js'
import { WebRTCTransportService } from './webrtc.js'

interface ISimpleTransportEvents extends ITransportEvents {
  multiAddr: (src: Multiaddr) => void
  hello: (enr: string) => void
}

export declare type SimpleTransportEventEmitter = StrictEventEmitter<
  EventEmitter,
  ISimpleTransportEvents
>

/**
 * This class is responsible for encoding outgoing Packets and decoding incoming Packets over Websockets
 */
export class SimpleTransportService
  extends (EventEmitter as { new (): SimpleTransportEventEmitter })
  implements ITransportService
{
  private log: Debugger
  public multiaddr: Multiaddr
  public nodeId: string
  public rtcTransport?: WebRTCTransportService
  public wsTransport?: WebSocketTransportService
  constructor(multiaddr: Multiaddr, nodeId: string, proxyAddress?: string) {
    //eslint-disable-next-line constructor-super
    super()
    this.log = debug('Portal').extend('SimpleTransportService')
    this.multiaddr = multiaddr
    this.nodeId = nodeId
    this.rtcTransport = new WebRTCTransportService(multiaddr, nodeId)
    this.wsTransport = proxyAddress
      ? new WebSocketTransportService(multiaddr, nodeId, proxyAddress)
      : undefined
  }
  async start() {
    await this.wsTransport?.start()
    this.wsTransport?.on('packet', (src, packet) => {
      this.emit('packet', src, packet)
    })
    this.wsTransport?.on('decodeError', (err, src) => {
      this.emit('decodeError', err, src)
    })
    this.wsTransport?.on('multiAddr', (src) => {
      this.emit('multiAddr', src)
    })
    await this.rtcTransport?.start()
    this.rtcTransport?.on('packet', (src, packet) => {
      this.emit('packet', src, packet)
    })
    this.rtcTransport?.on('decodeError', (err, src) => {
      this.emit('decodeError', err, src)
    })
    this.rtcTransport?.on('multiAddr', (src) => {
      this.emit('multiAddr', src)
    })
    this.rtcTransport?.on('hello', (enr) => {
      this.emit('hello', enr)
    })
  }
  async stop() {
    await this.wsTransport?.stop()
    await this.rtcTransport?.stop()
  }

  async send(to: Multiaddr, toId: string, packet: IPacket) {
    if (this.rtcTransport) {
      try {
        await this.rtcTransport.send(to, toId, packet)
        return
      } catch {}
    }
    if (this.wsTransport) {
      // Send via websocket
      await this.wsTransport.send(to, toId, packet)
    }
  }
}
