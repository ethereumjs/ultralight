import { EventEmitter } from 'events'
import { ITransportService } from '@chainsafe/discv5'
import { multiaddr as ma } from '@multiformats/multiaddr'
import { decodePacket, encodePacket } from '@chainsafe/discv5/packet'
import { getSocketAddressOnENR } from '@chainsafe/discv5'
import { MAX_PACKET_SIZE } from '../wire'
import { bind, send } from "@kuyoonjo/tauri-plugin-udp"
import { listen } from "@tauri-apps/api/event"

import type { Multiaddr } from '@multiformats/multiaddr'
import type { IPacket } from '@chainsafe/discv5/packet'
import type { IPMode, IRemoteInfo, TransportEventEmitter, SocketAddress } from '@chainsafe/discv5'
import type { ENR } from '@chainsafe/enr'

export class TauriUDPTransportService 
  extends (EventEmitter as { new (): TransportEventEmitter })
  implements ITransportService
{
  private socketId: string = 'portal-client-socket-id'
  private isListening = false
  private unlisten: (() => void) | null = null

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
    const host = opts.host || '0.0.0.0'
    const address = `${host}:${port}`

    try {
      await bind(this.socketId, address, true)
       
      this.unlisten = await listen(`udp://message/${this.socketId}`, (event) => {
        const payload = event.payload as { 
          buffer: number[], 
          addr: string,
          port: number 
        }
        
        console.log(`Received message from ${payload.addr}:${payload.port}, size: ${payload.buffer.length}`)
        
        const data = new Uint8Array(payload.buffer)
        
        const rinfo: IRemoteInfo = {
          address: payload.addr,
          port: payload.port,
          family: 'IPv4',
          size: payload.buffer.length
        }
        
        this.handleIncoming(data, rinfo)
      })
      
      const errorUnlisten = await listen(`udp://error/${this.socketId}`, (event) => {
        console.error('Socket error:', event.payload)
      })
      
      // Store the combined unlisten function
      const originalUnlisten = this.unlisten
      this.unlisten = () => {
        originalUnlisten()
        errorUnlisten()
      }
      
      this.isListening = true
      console.log(`UDP Transport bound to ${address}:${port}, socket ID: ${this.socketId}`)
    } catch (error) {
      console.error('Failed to start UDP transport:', error)
      throw error
    }
  }

  public async stop(): Promise<void> {
    if (!this.isListening) return

    try {
      if (this.unlisten) {
        this.unlisten()
        this.unlisten = null
      }
      
      this.socketId = ''
      this.isListening = false
      console.log('UDP Transport stopped')
    } catch (error) {
      console.error('Failed to stop UDP transport:', error)
      throw error
    }
  }

  public async send(to: Multiaddr, toId: string, packet: IPacket): Promise<void> {
    if (!this.isListening || this.socketId === null) {
      throw new Error('Transport not started')
    }

    const nodeAddr = to.toOptions()
    const encodedPacket = encodePacket(toId, packet)

    try {
      console.log(`Sending packet to ${nodeAddr.host}:${nodeAddr.port}, size: ${encodedPacket.length}`)
      
      const buffer = Array.from(encodedPacket)
      const address = `${nodeAddr.host}:${nodeAddr.port}`
      await send(this.socketId, address, buffer)
      
      console.log(`Successfully sent packet to ${nodeAddr.host}:${nodeAddr.port}`)
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
