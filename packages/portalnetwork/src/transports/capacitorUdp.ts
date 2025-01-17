import { EventEmitter } from 'events'
import { getSocketAddressOnENR } from '@chainsafe/discv5'
import { decodePacket, encodePacket } from '@chainsafe/discv5/packet'
import { UDP } from '@frontall/capacitor-udp'
import { multiaddr as ma } from '@multiformats/multiaddr'

import type { IRateLimiter } from './rateLimiter.js'
import type { SocketAddress } from '@chainsafe/discv5'
import type { IPacket } from '@chainsafe/discv5/packet'
import type {
  IPMode,
  IRemoteInfo,
  ITransportService,
  TransportEventEmitter,
} from '@chainsafe/discv5/transport'
import type { ENR } from '@chainsafe/enr'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * This class is responsible for encoding outgoing Packets and decoding incoming Packets over UDP
 */
export class CapacitorUDPTransportService
  extends (EventEmitter as { new (): TransportEventEmitter })
  implements ITransportService
{
  private socket!: {
    socketId: number
    ipv4: string
    ipv6: string
  }
  private srcId: string
  bindAddrs: Multiaddr[] = []
  ipMode: IPMode = {
    ip4: true,
    ip6: false,
  }
  private rateLimiter?: IRateLimiter
  public constructor(multiaddr: Multiaddr, srcId: string, rateLimiter?: IRateLimiter) {
    //eslint-disable-next-line constructor-super
    super()
    this.bindAddrs = [multiaddr]
    this.srcId = srcId
    this.rateLimiter = rateLimiter
  }

  public async start(): Promise<void> {
    const opts = this.bindAddrs[0].toOptions()
    this.socket = await UDP.create()
    const port = Number.isInteger(opts.port) ? opts.port : 5050
    await UDP.bind({
      socketId: this.socket.socketId,
      address: this.socket.ipv4,
      port,
    })
    UDP.addListener('receive', (ret: any) => {
      this.handleIncoming(new Uint8Array(Buffer.from(ret.buffer, 'base64')), {
        family: 'IPv4',
        address: ret.remoteAddress,
        port: ret.remotePort,
        size: ret.buffer.length,
      })
    })
  }

  public async stop(): Promise<void> {
    await UDP.closeAllSockets()
  }

  public async send(to: Multiaddr, toId: string, packet: IPacket): Promise<void> {
    const nodeAddr = to.toOptions()
    await UDP.send({
      socketId: this.socket.socketId,
      address: nodeAddr.host,
      port: nodeAddr.port,
      buffer: encodePacket(toId, packet).toString('base64'),
    })
  }

  public handleIncoming = (data: Uint8Array, rinfo: IRemoteInfo): void => {
    if (this.rateLimiter && !this.rateLimiter.allowEncodedPacket(rinfo.address)) {
      return
    }
    const multiaddr = ma(
      `/${rinfo.family === 'IPv4' ? 'ip4' : 'ip6'}/${rinfo.address}/udp/${rinfo.port}`,
    )
    try {
      const packet = decodePacket(this.srcId, Buffer.from(data))
      this.emit('packet', multiaddr, packet)
    } catch (e) {
      this.emit('decodeError', e as any, multiaddr)
    }
  }

  getContactableAddr(enr: ENR): SocketAddress | undefined {
    return getSocketAddressOnENR(enr, this.ipMode)
  }
}
