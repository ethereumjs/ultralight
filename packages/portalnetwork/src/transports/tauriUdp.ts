import { EventEmitter } from 'events'
import { ITransportService } from '@chainsafe/discv5'
import { multiaddr as ma } from '@multiformats/multiaddr'
import { encodeHeader } from '@chainsafe/discv5/packet'
import { getSocketAddressOnENR } from '@chainsafe/discv5'
import { bind, send, unbind } from '@kuyoonjo/tauri-plugin-udp'
import { listen } from '@tauri-apps/api/event'
import { concatBytes } from 'ethereum-cryptography/utils'
import { decodePacketAsync } from '../util/portalClient/helpers.js'

import type { Multiaddr } from '@multiformats/multiaddr'
import type { IPacket } from '@chainsafe/discv5/packet'
import type { IPMode, IRemoteInfo, TransportEventEmitter, SocketAddress } from '@chainsafe/discv5'
import type { ENR } from '@chainsafe/enr'
interface UdpMessage {
  id: string
  addr: string
  port: number
  data: number[]
}


export class TauriUDPTransportService 
  extends (EventEmitter as { new (): TransportEventEmitter }) 
  implements ITransportService {
  
  private socketId: string
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
    this.socketId = `portal-client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
  
  public async start(): Promise<void> {
    if (this.isListening) return
    
    const opts = this.bindAddrs[0].toOptions()
    console.log('Starting UDP transport with options:', opts)
    const port = Number.isInteger(opts.port) ? opts.port : 0
    const host = opts.host || '0.0.0.0'
    const address = `${host}:${port}`
    
    try {
      await bind(this.socketId, address)
      console.log(`UDP socket bound to ${address}`)
      
      this.unlisten = await listen('plugin://udp', (event) => {
        console.log('event ', event)
        const payload = event.payload as UdpMessage
        
        if (payload.id !== this.socketId) {
          return
        }
      
        const data = new Uint8Array(payload.data)
        
        const [address, port] = payload.addr.split(':')
        const rinfo: IRemoteInfo = {
          address,
          port: Number(port),
          family: 'IPv4',
          size: payload.data.length,
        }
        
        this.handleIncoming(data, rinfo)
      })
      
      this.isListening = true
      console.log(`UDP Transport started with socket ID: ${this.socketId}`)
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
        await unbind(this.socketId)
      }
      
      this.isListening = false
      console.log('UDP Transport stopped')
    } catch (error) {
      console.error('Failed to stop UDP transport:', error)
      throw error
    }
  }
  
  public async send(to: Multiaddr, toId: string, packet: IPacket): Promise<void> {
    if (!this.isListening) {
      throw new Error('Transport not started')
    }
    
    try {
      const nodeAddr = to.toOptions()
      const encodedHeader = await encodeHeader(toId, packet.maskingIv, packet.header)
      console.log('message before send ', packet.message)
      const fullPacket = concatBytes(packet.maskingIv, encodedHeader, packet.message)
      const address = `${nodeAddr.host}:${nodeAddr.port}`

      await send(this.socketId, address, Array.from(fullPacket))
      console.log(`Successfully sent packet to ${address} message: ${packet.message}`)
    } catch (error) {
      console.error('Failed to send packet:', error)
      throw error
    }
  }
  
  private handleIncoming = async (data: Uint8Array, rinfo: IRemoteInfo): Promise<void> => {
    console.log('rinfo ', rinfo)
    console.log(`Processing packet from ${rinfo.address}, size: ${data.length}`)
    
    const multiaddr = ma(
      `/${rinfo.family === 'IPv4' ? 'ip4' : 'ip6'}/${rinfo.address}/udp/${rinfo.port}`
    )
    
    try {
      const dataCopy = new Uint8Array(data)  
      const packet = await decodePacketAsync(this.srcId, dataCopy)
      console.log('decoded packet ', packet)
      console.log('Emitting packet with types:', {
        maskingIvType: packet.maskingIv?.constructor?.name,
        headerType: packet.header?.constructor?.name,
        messageType: packet.message?.constructor?.name
      })
      this.emit('packet', multiaddr, packet)
      console.log('packet emitted')
    } catch (e) {
      console.error('Failed to decode packet:', e)
      this.emit('decodeError', e as any, multiaddr)
    }
  }
  
  public getContactableAddr(enr: ENR): SocketAddress | undefined {
    return getSocketAddressOnENR(enr, this.ipMode)
  }
}


