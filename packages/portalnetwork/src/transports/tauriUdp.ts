import { EventEmitter } from 'events'
import { ITransportService } from '@chainsafe/discv5'
import { multiaddr as ma } from '@multiformats/multiaddr'
import { encodeHeader, decodePacket, encodePacket } from '@chainsafe/discv5/packet'
import { getSocketAddressOnENR } from '@chainsafe/discv5'
import { bind, send, unbind } from '@kuyoonjo/tauri-plugin-udp'
import { listen } from '@tauri-apps/api/event'
import { concatBytes } from 'ethereum-cryptography/utils'

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
    const port = Number.isInteger(opts.port) ? opts.port : 0
    const host = opts.host || '0.0.0.0'
    const address = `${host}:${port}`
    
    try {
      await bind(this.socketId, address)
      
      this.unlisten = await listen('plugin://udp', (event) => {
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
    } catch (error) {
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
    } catch (error) {
      throw error
    }
  }
  
  public async send(to: Multiaddr, toId: string, packet: IPacket): Promise<void> {
    if (!this.isListening) {
      throw new Error('Transport not started')
    }
    
    try {
      const nodeAddr = to.toOptions()
      const encodedHeader = encodeHeader(toId, packet.maskingIv, packet.header)
      const fullPacket = concatBytes(packet.maskingIv, encodedHeader, packet.message)
      const address = `${nodeAddr.host}:${nodeAddr.port}`

      await send(this.socketId, address, Array.from(encodePacket(toId, packet)))
    } catch (error) {
      throw error
    }
  }
  
  private handleIncoming = async (data: Uint8Array, rinfo: IRemoteInfo): Promise<void> => {
  
    const multiaddr = ma(
      `/${rinfo.family === 'IPv4' ? 'ip4' : 'ip6'}/${rinfo.address}/udp/${rinfo.port}`
    )
    
    try {
      const dataCopy = new Uint8Array(data) 
      const packet = decodePacket(this.srcId, dataCopy) 
      this.emit('packet', multiaddr, packet)
    } catch (e) {
      this.emit('decodeError', e as any, multiaddr)
    }
  }
  
  public getContactableAddr(enr: ENR): SocketAddress | undefined {
    return getSocketAddressOnENR(enr, this.ipMode)
  }
}


