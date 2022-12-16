import debug, { Debugger } from 'debug'
import { EventEmitter } from 'events'
import { Multiaddr, multiaddr as ma } from '@multiformats/multiaddr'
import { decodePacket, encodePacket, IPacket } from '@chainsafe/discv5/packet'
import {
  IRemoteInfo,
  ITransportEvents,
  ITransportService,
} from '@chainsafe/discv5/lib/transport/types.js'
import WebSocketAsPromised from 'websocket-as-promised'
import { numberToBuffer } from '@chainsafe/discv5'
import StrictEventEmitter from 'strict-event-emitter-types/types/src'
import WebSocket from 'isomorphic-ws'
import { RTCPeerManager } from '../index.js'

interface IWebSocketTransportEvents extends ITransportEvents {
  multiAddr: (src: Multiaddr) => void
}

declare type WSTransportEventEmitter = StrictEventEmitter<EventEmitter, IWebSocketTransportEvents>

/**
 * This class is responsible for encoding outgoing Packets and decoding incoming Packets over Websockets
 */
export class SimpleTransportService
  extends (EventEmitter as { new (): WSTransportEventEmitter })
  implements ITransportService
{
  private log: Debugger
  public multiaddr: Multiaddr
  public nodeId: string
  public RTC: RTCPeerManager
  private socket: WebSocketAsPromised
  constructor(multiaddr: Multiaddr, nodeId: string, proxyAddress: string) {
    //eslint-disable-next-line constructor-super
    super()
    this.log = debug('Portal').extend('SimpleTransportService')
    this.multiaddr = multiaddr
    this.nodeId = nodeId
    this.RTC = new RTCPeerManager(this.nodeId)
    this.socket = new WebSocketAsPromised(proxyAddress, {
      packMessage: (data: Buffer) => data.buffer,
      unpackMessage: (data) => data,
      //@ts-ignore node websocket types don't match browser websocket types - so tell Typescript not to worry about it
      createWebSocket: (url) => new WebSocket(url),
      extractMessageData: (event) => event,
    })
  }
  async start() {
    this.RTC.on('packet', (srcId: string, packet: string) => {
      this.handleRTCMessage(packet)
    })
    await this.socket.open()
    this.socket.ws.binaryType = 'arraybuffer'
    this.socket.onMessage.addListener((msg: MessageEvent | ArrayBuffer) => {
      const data = msg instanceof MessageEvent ? Buffer.from(msg.data) : Buffer.from(msg)

      if (data.length === 6) {
        const address = `${data[0].toString()}.${data[1].toString()}.${data[2].toString()}.${data[3].toString()}`
        const port = data.readUIntBE(4, 2)
        this.multiaddr = ma(`/ip4/${address}/udp/${port}`)

        this.emit('multiAddr', this.multiaddr)
      } else {
        this.handleIncoming(data)
      }
    })
    this.socket.onClose.addListener(() => this.log('socket to proxy closed'))

    this.log(`Starting Transport with nodeId: ${this.nodeId}`)
    this.RTC.listen()
  }
  async stop() {
    await this.socket.close()
  }
  async send(to: Multiaddr, toId: string, packet: IPacket) {
    if (Object.keys(this.RTC.usernames).includes(toId)) {
      this.log.extend('SEND_WEBRTC')('sending...')
      const message = {
        address: to.toString(),
        buffer: encodePacket(toId, packet).toString('base64'),
      }
      this.RTC.newMessage = JSON.stringify(message)
      await this.RTC.sendMessage(toId)
      // }
    } else {
      // Send via websocket (i.e. in browser)
      this.log.extend('SEND_WEBSOCKET')('sending...')
      const opts = to.toOptions()
      const encodedPacket = encodePacket(toId, packet)
      const encodedAddress = Uint8Array.from(opts.host.split('.').map((num) => parseInt(num)))
      const encodedPort = numberToBuffer(opts.port, 2)
      const encodedMessage = new Uint8Array([
        ...Uint8Array.from(encodedAddress),
        ...Uint8Array.from(encodedPort),
        ...Uint8Array.from(encodedPacket),
      ])
      this.socket.sendPacked(encodedMessage)
    }
  }

  public handleRTCMessage(data: string) {
    this.log.extend('HANDLE_WEBRTC')('handling...')
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

  public handleIncoming = (data: Uint8Array): void => {
    this.log.extend('HANDLE_WEBSOCKET')('handling...')
    const rinfoLength = parseInt(data.slice(0, 2).toString())
    const rinfo = JSON.parse(
      new TextDecoder().decode(data.slice(2, rinfoLength + 2))
    ) as IRemoteInfo
    const multiaddr = ma(
      `/${rinfo.family === 'IPv4' ? 'ip4' : 'ip6'}/${rinfo.address}/udp/${rinfo.port}`
    )
    const packetBuf = Buffer.from(data.slice(2 + rinfoLength))
    try {
      const packet = decodePacket(this.nodeId, packetBuf)
      this.emit('packet', multiaddr, packet)
    } catch (e) {
      this.emit('decodeError', e as Error, multiaddr)
    }
  }
}
