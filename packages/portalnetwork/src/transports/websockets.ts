import { EventEmitter } from 'events'
import { getSocketAddressOnENR } from '@chainsafe/discv5'
import { decodePacket, encodePacket } from '@chainsafe/discv5/packet'
import { multiaddr as ma } from '@multiformats/multiaddr'
import debug from 'debug'
import WebSocket from 'isomorphic-ws'
import WebSocketAsPromised from 'websocket-as-promised'

import type { SocketAddress } from '@chainsafe/discv5'
import type {
  IPMode,
  IRemoteInfo,
  ITransportEvents,
  ITransportService,
} from '@chainsafe/discv5/lib/transport/types.js'
import type { IPacket } from '@chainsafe/discv5/packet'
import type { ENR } from '@chainsafe/enr'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Debugger } from 'debug'
import type StrictEventEmitter from 'strict-event-emitter-types/types/src'
import type { IRateLimiter } from './rateLimiter.js'
const log = debug('discv5:transport')

interface WebSocketTransportEvents extends ITransportEvents {
  multiAddr: (src: Multiaddr) => void
}

export declare type WSTransportEventEmitter = StrictEventEmitter<
  EventEmitter,
  WebSocketTransportEvents
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
  private rateLimiter?: IRateLimiter
  ipMode: IPMode = {
    ip4: true,
    ip6: false,
  }
  bindAddrs: Multiaddr[] = []

  public constructor(multiaddr: Multiaddr, srcId: string, proxyAddress: string, rateLimiter?: IRateLimiter) {
    //eslint-disable-next-line constructor-super
    super()
    this.log = debug('Portal').extend('WebSocketTransportService')
    this.multiaddr = multiaddr
    this.srcId = srcId
    this.socket = new WebSocketAsPromised(`${proxyAddress}/portal`, {
      packMessage: (data: Uint8Array) => data.buffer as ArrayBuffer,
      unpackMessage: (data) => data,
      //@ts-ignore node websocket types don't match browser websocket types - so tell Typescript not to worry about it
      createWebSocket: (url) => new WebSocket(url),
      extractMessageData: (event) => event,
    })
    this.rateLimiter = rateLimiter
  }

  public async start(): Promise<void> {
    this.socket.onOpen.addListener(() => {
      this.log('opening websocket')
      console.log('opening websocket', this.multiaddr.nodeAddress().port)
      this.socket.send(`port:${this.multiaddr.nodeAddress().port}`)
    })
    await this.socket.open()
    this.socket.ws.binaryType = 'arraybuffer'
    this.socket.onMessage.addListener((msg: MessageEvent | ArrayBuffer) => {
      const data = msg instanceof MessageEvent ? Buffer.from(msg.data) : Buffer.from(msg)
      if (data.length === 2) {
        const port = new DataView(data.buffer).getUint16(0, false)
        this.log(`Received port assignment: ${port}`)
        console.log(`Received port assignment: ${port}`)
        
        const ip = '0.0.0.0'
        this.multiaddr = ma(`/ip4/${ip}/udp/${port}`)
        this.emit('multiAddr', this.multiaddr)
      } else {
        this.handleIncoming(new Uint8Array(data))
      }
    })
    this.socket.onClose.addListener(() => log('socket to proxy closed'))

    this.socket.onError.addListener((error) => {
      this.log('WebSocket error:', error)
    })
  }

  public async stop(): Promise<void> {
    await this.socket.close()
  }

 public async send(to: Multiaddr, toId: string, packet: IPacket): Promise<void> {
  console.log('=== START WebSocket Send ===')
  
  if (!this.socket.isOpened) {
    console.error('ERROR: WebSocket not connected. Cannot send packet.')
    console.log('Attempting to reconnect...')
    try {
      await this.socket.open()
      console.log('Reconnection successful')
    } catch (err) {
      console.error('Failed to reconnect:', err)
      return
    }
  }
  
  const opts = to.toOptions()
  console.log(`Destination: ${opts.host}:${opts.port}`)
  
  try {
    console.log('Encoding packet...')
    const encodedPacket = encodePacket(toId, packet)
    console.log(`Packet encoded, length: ${encodedPacket.length} bytes`)

    console.log('Parsing IP address...')
    const ipParts = opts.host.split('.').map(part => parseInt(part, 10))
    console.log('IP parts:', ipParts)
    
    if (ipParts.length !== 4 || ipParts.some(part => isNaN(part) || part < 0 || part > 255)) {
      console.error('ERROR: Invalid IP address format:', opts.host)
      return
    }

    const ipBytes = new Uint8Array(ipParts)
    console.log('IP bytes:', Array.from(ipBytes))
    
    const portBytes = new Uint8Array(2)
    const portView = new DataView(portBytes.buffer)
    portView.setUint16(0, opts.port, false)
    console.log('Port bytes:', Array.from(portBytes))
    
    const message = new Uint8Array(ipBytes.length + portBytes.length + encodedPacket.length)
    message.set(ipBytes, 0)
    message.set(portBytes, ipBytes.length)
    message.set(encodedPacket, ipBytes.length + portBytes.length)
    
    console.log(`Complete message assembled, total length: ${message.length} bytes`)
    console.log('Header:', Array.from(message.slice(0, 6)))
    
    console.log('Sending WebSocket message...')
    this.socket.sendPacked(message)
    console.log('Message sent successfully')
  } catch (error) {
    console.error('ERROR in send process:', error)
  }
  
  console.log('=== END WebSocket Send ===')
}

  public handleIncoming = (data: Uint8Array): void => {
    console.log('websocket incoming data', data)
    const rinfoLength = parseInt(data.slice(0, 2).toString())
    const rinfo = JSON.parse(
      new TextDecoder().decode(data.slice(2, rinfoLength + 2)),
    ) as IRemoteInfo
    if (this.rateLimiter && !this.rateLimiter.allowEncodedPacket(rinfo.address)) {
      return
    }
    const multiaddr = ma(
      `/${rinfo.family === 'IPv4' ? 'ip4' : 'ip6'}/${rinfo.address}/udp/${rinfo.port}`,
    )
    const packetBuf = Buffer.from(data.slice(2 + rinfoLength))
    try {
      const packet = decodePacket(this.srcId, new Uint8Array(packetBuf))
      this.emit('packet', multiaddr, packet)
    } catch (e) {
      this.emit('decodeError', e as Error, multiaddr)
    }
  }

  getContactableAddr(enr: ENR): SocketAddress | undefined {
    return getSocketAddressOnENR(enr, this.ipMode)
  }
}
