import debug, { Debugger } from 'debug'
import { EventEmitter } from 'events'
import { Multiaddr, multiaddr as ma } from '@multiformats/multiaddr'
import { decodePacket, encodePacket, IPacket } from '@chainsafe/discv5/packet'
import { ITransportEvents, ITransportService } from '@chainsafe/discv5/lib/transport/types.js'
import StrictEventEmitter from 'strict-event-emitter-types/types/src'
import { RTCPeerManager } from '../index.js'

interface IWebRTCTransportEvents extends ITransportEvents {
  multiAddr: (src: Multiaddr) => void
  hello: (enr: string) => void
}

export declare type WebRTCTransportEventEmitter = StrictEventEmitter<
  EventEmitter,
  IWebRTCTransportEvents
>

/**
 * This class is responsible for encoding outgoing Packets and decoding incoming Packets over Websockets
 */
export class WebRTCTransportService
  extends (EventEmitter as { new (): WebRTCTransportEventEmitter })
  implements ITransportService
{
  private log: Debugger
  public multiaddr: Multiaddr
  public nodeId: string
  public RTC: RTCPeerManager
  constructor(multiaddr: Multiaddr, nodeId: string) {
    //eslint-disable-next-line constructor-super
    super()
    this.log = debug('Portal').extend('Transport').extend('WebRTC')
    this.multiaddr = multiaddr
    this.nodeId = nodeId
    this.RTC = new RTCPeerManager(this.nodeId)
  }
  async start() {
    this.RTC.on('packet', (srcId: string, packet: string) => {
      this.handleIncoming(packet)
    })
    this.RTC.on('hello', (enr) => this.emit('hello', enr))
    this.log(`Starting Transport with nodeId: ${this.nodeId}`)
    this.RTC.listen()
  }
  async stop() {}

  async send(to: Multiaddr, toId: string, packet: IPacket) {
    if (Object.keys(this.RTC.usernames).indexOf(toId) === -1) {
      throw new Error('No WebRTC')
    }
    this.log.extend('SEND')(`To: ${toId}`)
    const message = {
      address: to.toString(),
      buffer: encodePacket(toId, packet).toString('base64'),
    }
    this.RTC.newMessage = JSON.stringify(message)
    await this.RTC.sendMessage(toId)
  }

  public handleIncoming(data: string) {
    this.log.extend('RECV')(`Handling incoming packet`)
    const message = JSON.parse(data)
    const multi = ma(message.address)
    const packetBuf = Buffer.from(message.buffer, 'base64')
    try {
      const packet = decodePacket(this.nodeId, packetBuf)
      this.emit('packet', multi, packet)
    } catch (e) {
      this.emit('decodeError', e as Error, multi)
    }
  }
}
