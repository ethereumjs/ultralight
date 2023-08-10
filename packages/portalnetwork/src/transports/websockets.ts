import debug, { Debugger } from 'debug'
import { EventEmitter } from 'events'
import { Multiaddr, multiaddr as ma } from '@multiformats/multiaddr'
import { decodePacket, encodePacket, IPacket } from '@chainsafe/discv5/packet'
import {
  IPMode,
  IRemoteInfo,
  ITransportEvents,
  ITransportService,
} from '@chainsafe/discv5/lib/transport/types.js'
import WebSocketAsPromised from 'websocket-as-promised'
import WebSocket from 'isomorphic-ws'
import StrictEventEmitter from 'strict-event-emitter-types/types/src'
import { SocketAddress } from '@chainsafe/discv5/lib/util/ip'
import { BaseENR } from '@chainsafe/discv5'
const log = debug('discv5:transport')

interface IWebSocketTransportEvents extends ITransportEvents {
  multiAddr: (src: Multiaddr) => void
}

export declare type WSTransportEventEmitter = StrictEventEmitter<
  EventEmitter,
  IWebSocketTransportEvents
>
/**
 * This class is responsible for encoding outgoing Packets and decoding incoming Packets over Websockets
 */
export class WebSocketTransportService
  extends (EventEmitter as { new (): WSTransportEventEmitter })
  implements ITransportService
{
  public multiaddr: Multiaddr
  private socket: WebSocketAsPromised
  private srcId: string
  private log: Debugger
  ipMode: IPMode = {
    ip4: true,
    ip6: false
  }
  bindAddrs: Multiaddr[] = []
  public constructor(multiaddr: Multiaddr, srcId: string, proxyAddress: string) {
    //eslint-disable-next-line constructor-super
    super()
    this.log = debug('Portal').extend('WebSocketTransportService')
    this.multiaddr = multiaddr
    this.srcId = srcId
    this.socket = new WebSocketAsPromised(proxyAddress, {
      packMessage: (data: Buffer) => data.buffer,
      unpackMessage: (data) => data,
      //@ts-ignore node websocket types don't match browser websocket types - so tell Typescript not to worry about it
      createWebSocket: (url) => new WebSocket(url),
      extractMessageData: (event) => event,
    })
  }

  public async start(): Promise<void> {
    this.socket.onOpen.addListener(() => {
      this.log('opening websocket')
      this.socket.send(`port:${this.multiaddr.nodeAddress().port}`)
    })
    await this.socket.open()
    this.socket.ws.binaryType = 'arraybuffer'
    this.socket.onMessage.addListener((msg: MessageEvent | ArrayBuffer) => {
      const data = msg instanceof MessageEvent ? Buffer.from(msg.data) : Buffer.from(msg)

      if (data.length === 6) {
        // const address = `${data[0].toString()}.${data[1].toString()}.${data[2].toString()}.${data[3].toString()}`
        // const port = data.readUIntBE(4, 2)
        // this.multiaddr = ma(`/ip4/${address}/udp/${port}`)
        // this.emit('multiAddr', this.multiaddr)
      } else {
        this.handleIncoming(data)
      }
    })
    this.socket.onClose.addListener(() => log('socket to proxy closed'))
  }

  public async stop(): Promise<void> {
    await this.socket.close()
  }

  public async send(to: Multiaddr, toId: string, packet: IPacket): Promise<void> {
    this.log('sending via websocket')
    // Send via websocket (i.e. in browser)
    const opts = to.toOptions()
    const encodedPacket = encodePacket(toId, packet)
    const encodedAddress = Uint8Array.from(opts.host.split('.').map((num) => parseInt(num)))
    const encodedPort = new Uint8Array(2)
    new DataView(new Uint8Array(2).buffer).setUint16(0, opts.port)
    const encodedMessage = new Uint8Array([
      ...Uint8Array.from(encodedAddress),
      ...encodedPort,
      ...Uint8Array.from(encodedPacket),
    ])
    this.socket.sendPacked(encodedMessage)
  }

  public handleIncoming = (data: Uint8Array): void => {
    const rinfoLength = parseInt(data.slice(0, 2).toString())
    const rinfo = JSON.parse(
      new TextDecoder().decode(data.slice(2, rinfoLength + 2))
    ) as IRemoteInfo
    const multiaddr = ma(
      `/${rinfo.family === 'IPv4' ? 'ip4' : 'ip6'}/${rinfo.address}/udp/${rinfo.port}`
    )
    const packetBuf = Buffer.from(data.slice(2 + rinfoLength))
    try {
      const packet = decodePacket(this.srcId, packetBuf)
      this.emit('packet', multiaddr, packet)
    } catch (e) {
      this.emit('decodeError', e as Error, multiaddr)
    }
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
