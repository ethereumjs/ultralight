import { EventEmitter } from 'events'
import type {
  IPMode,
  IRemoteInfo,
  ITransportService,
  SocketAddress,
  TransportEventEmitter,
} from '@chainsafe/discv5'
import { getSocketAddressOnENR } from '@chainsafe/discv5'
import { decodePacket, encodePacket } from '@chainsafe/discv5/packet'
import { bind, send, unbind } from '@kuyoonjo/tauri-plugin-udp'
import { multiaddr as ma } from '@multiformats/multiaddr'
import { listen } from '@tauri-apps/api/event'

import type { IPacket } from '@chainsafe/discv5/packet'
import type { ENR } from '@chainsafe/enr'
import type { Multiaddr } from '@multiformats/multiaddr'
interface UdpMessage {
  id: string
  addr: string
  port: number
  data: number[]
}

export class TauriUDPTransportService
  extends (EventEmitter as { new (): TransportEventEmitter })
  implements ITransportService
{
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

      void this.handleIncoming(data, rinfo)
    })

    this.isListening = true
  }

  public async stop(): Promise<void> {
    if (!this.isListening) return

    if (this.unlisten) {
      this.unlisten()
      this.unlisten = null
      await unbind(this.socketId)
    }

    this.isListening = false
  }

  public async send(to: Multiaddr, toId: string, packet: IPacket): Promise<void> {
    if (!this.isListening) {
      throw new Error('Transport not started')
    }

    const nodeAddr = to.toOptions()
    const address = `${nodeAddr.host}:${nodeAddr.port}`

    await send(this.socketId, address, Array.from(encodePacket(toId, packet)))
  }

  private handleIncoming = async (data: Uint8Array, rinfo: IRemoteInfo): Promise<void> => {
    const multiaddr = ma(
      `/${rinfo.family === 'IPv4' ? 'ip4' : 'ip6'}/${rinfo.address}/udp/${rinfo.port}`,
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
