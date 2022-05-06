import { EventEmitter } from 'events'
import { Multiaddr } from 'multiaddr'
import { UDP } from '@frontall/capacitor-udp'
import { decodePacket, encodePacket, IPacket } from '@chainsafe/discv5/lib/packet'
import {
  IRemoteInfo,
  ITransportService,
  TransportEventEmitter,
} from '@chainsafe/discv5/lib/transport/types'

/**
 * This class is responsible for encoding outgoing Packets and decoding incoming Packets over UDP
 */
export class CapacitorUDPTransportService
  //eslint-disable-next-line prettier/prettier
  extends (EventEmitter as { new(): TransportEventEmitter })
  //eslint-disable-next-line prettier/prettier
  implements ITransportService {
  public multiaddr: Multiaddr
  private socket!: {
    socketId: number
    ipv4: string
    ipv6: string
  }
  private srcId: string

  public constructor(multiaddr: Multiaddr, srcId: string) {
    //eslint-disable-next-line constructor-super
    super()
    this.multiaddr = multiaddr
    this.srcId = srcId
  }

  public async start(): Promise<void> {
    const opts = this.multiaddr.toOptions()
    this.socket = await UDP.create()
    await UDP.bind({
      socketId: this.socket.socketId,
      address: this.socket.ipv4,
      port: opts.port ?? 5050,
    })
    UDP.addListener('receive', (ret: any) => {
      this.handleIncoming(Buffer.from(ret.buffer, 'base64'), {
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

  public handleIncoming = (data: Buffer, rinfo: IRemoteInfo): void => {
    const multiaddr = new Multiaddr(
      `/${rinfo.family === 'IPv4' ? 'ip4' : 'ip6'}/${rinfo.address}/udp/${rinfo.port}`
    )
    try {
      const packet = decodePacket(this.srcId, data)
      this.emit('packet', multiaddr, packet)
    } catch (e) {
      this.emit('decodeError', e as any, multiaddr)
    }
  }
}
