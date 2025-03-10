import dgramPolyfill from './dgramMock'
import { EventEmitter } from 'events'
import { ITransportService } from '@chainsafe/discv5'
import { multiaddr as ma } from '@multiformats/multiaddr'
import { decodePacket, encodePacket } from '@chainsafe/discv5/packet'
import { getSocketAddressOnENR } from '@chainsafe/discv5'
import { MAX_PACKET_SIZE } from '../wire'

import type { Multiaddr } from '@multiformats/multiaddr'
import type { IPacket } from '@chainsafe/discv5/packet'
import type { IPMode, IRemoteInfo, TransportEventEmitter, SocketAddress } from '@chainsafe/discv5'
import type { ENR } from '@chainsafe/enr'

export class TauriUDPTransportService 
  extends (EventEmitter as { new (): TransportEventEmitter })
  implements ITransportService
{
  private socket: ReturnType<typeof dgramPolyfill.createSocket> | null = null
  private isListening = false

  bindAddrs: Multiaddr[] = []
  ipMode: IPMode = {
    ip4: true,
    ip6: false,
  }

  private srcId: string

  constructor(multiaddr: Multiaddr, srcId: string) {
    super()
    this.bindAddrs = [multiaddr]
    this.srcId = srcId
  }

  public async start(): Promise<void> {
    if (this.isListening) return

    const opts = this.bindAddrs[0].toOptions()
    console.log('Starting UDP transport with options:', opts)
    const port = Number.isInteger(opts.port) ? opts.port : 0
    const address = opts.host || '0.0.0.0'

    try {
      this.socket = dgramPolyfill.createSocket({
        type: 'udp4',
        recvBufferSize: 16 * MAX_PACKET_SIZE,
        sendBufferSize: MAX_PACKET_SIZE
      })
      
      console.log('Socket created', this.socket)
      
      this.socket.on('message', (msg: Buffer, rinfo: IRemoteInfo) => {
        console.log(`Received message from ${rinfo.address}:${rinfo.port}, size: ${rinfo.size}`)
        this.handleIncoming(new Uint8Array(msg), rinfo)
      })
      
      this.socket.on('error', (error) => {
        console.error('Socket error:', error)
      })

      await new Promise<void>((resolve, reject) => {
        this.socket!.bind(port, address, (error?: Error) => {
          console.log('Socket bind callback', port, address)
          if (error) {
            console.error('Failed to bind socket:', error)
            reject(error)
            return
          }
          const addr = this.socket!.address()
          console.log(`UDP Transport bound to ${addr.address}:${addr.port}`)
          resolve()
        })
      })

      this.isListening = true
      console.log('UDP Transport started successfully')
    } catch (error) {
      console.error('Failed to start UDP transport:', error)
      throw error
    }
  }

  public async stop(): Promise<void> {
    if (!this.isListening) return

    try {
      if (this.socket) {
        this.socket.close()
        this.socket = null
      }
      
      this.isListening = false
      console.log('UDP Transport stopped')
    } catch (error) {
      console.error('Failed to stop UDP transport:', error)
      throw error
    }
  }

  public async send(to: Multiaddr, toId: string, packet: IPacket): Promise<void> {
    if (!this.isListening || !this.socket) {
      throw new Error('Transport not started')
    }

    const nodeAddr = to.toOptions()
    const encodedPacket = encodePacket(toId, packet)

    try {
      console.log(`Sending packet to ${nodeAddr.host}:${nodeAddr.port}, size: ${encodedPacket.length}`)
      
      return new Promise<void>((resolve, reject) => {
        this.socket!.send(
          encodedPacket, 
          0, 
          encodedPacket.length, 
          nodeAddr.port, 
          nodeAddr.host,
          (error?: Error) => {
            if (error) {
              console.error('Failed to send packet:', error)
              reject(error)
              return
            }
            console.log(`Successfully sent packet to ${nodeAddr.host}:${nodeAddr.port}`)
            resolve()
          }
        )
      })
    } catch (error) {
      console.error('Failed to send packet:', error)
      throw error
    }
  }

  private handleIncoming = (data: Uint8Array, rinfo: IRemoteInfo): void => {
    console.log(`Processing packet from ${rinfo.address}:${rinfo.port}, size: ${data.length}`)
    const multiaddr = ma(
      `/${rinfo.family === 'IPv4' ? 'ip4' : 'ip6'}/${rinfo.address}/udp/${rinfo.port}`,
    )

    try {
      const packet = decodePacket(this.srcId, data)
      console.log(`Decoded packet type: ${packet.message}`)
      
      this.emit('packet', multiaddr, packet)
    } catch (e) {
      console.error('Failed to decode packet:', e)
      this.emit('decodeError', e as any, multiaddr)
    }
  }

  public getContactableAddr(enr: ENR): SocketAddress | undefined {
    return getSocketAddressOnENR(enr, this.ipMode)
  }
}