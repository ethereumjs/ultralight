import * as dgram from 'dgram'
import { EventEmitter } from 'events'
import { multiaddr as ma, Multiaddr } from '@multiformats/multiaddr'
import { decodePacket, encodePacket, IPacket, MAX_PACKET_SIZE } from '@chainsafe/discv5/packet'
import { IRemoteInfo, ITransportEvents, ITransportService } from '@chainsafe/discv5'
import { StrictEventEmitter } from 'strict-event-emitter-types'
import debug, { Debugger } from 'debug'
/**
 * This class is responsible for encoding outgoing Packets and decoding incoming Packets over UDP
 */
interface IUDPTransportEvents extends ITransportEvents {
  multiAddr: (src: Multiaddr) => void
  hello: (enr: string) => void
}

export declare type UDPTransportEventEmitter = StrictEventEmitter<EventEmitter, IUDPTransportEvents>

export class UDPTransportService
  extends (EventEmitter as { new (): UDPTransportEventEmitter })
  implements ITransportService
{
  multiaddr: any
  log: Debugger
  socket: dgram.Socket
  srcId: string
  constructor(multiaddr: any, srcId: string) {
    //eslint-disable-next-line constructor-super
    super()
    this.log = debug('Portal').extend('UDPTransportService')
    const opts = multiaddr.toOptions()
    if (opts.transport !== 'udp') {
      throw new Error('Local multiaddr must use UDP')
    }
    this.multiaddr = multiaddr
    this.srcId = srcId
    this.socket = dgram.createSocket({
      recvBufferSize: 16 * MAX_PACKET_SIZE,
      sendBufferSize: MAX_PACKET_SIZE,
      type: 'udp4',
    })
  }
  async start() {
    this.socket.on('message', this.handleIncoming)
    this.log(this.multiaddr.toString())
    this.socket.bind(this.multiaddr.nodeAddress().port, this.multiaddr.nodeAddress().address)
  }
  async stop() {
    this.socket.off('message', this.handleIncoming)
    this.socket.close()
  }
  async send(to: any, toId: string, packet: IPacket) {
    const nodeAddr = to.toOptions()
    this.socket.send(encodePacket(toId, packet), nodeAddr.port, nodeAddr.host)
  }
  handleIncoming = (data: Buffer, rinfo: IRemoteInfo) => {
    const multiaddr = ma(
      `/${String(rinfo.family).endsWith('4') ? 'ip4' : 'ip6'}/${rinfo.address}/udp/${rinfo.port}`
    )
    try {
      const packet = decodePacket(this.srcId, data)
      this.emit('packet', multiaddr as any, packet)
    } catch (e) {
      this.emit('decodeError', e as Error, multiaddr as any)
    }
  }
}
//# sourceMappingURL=udp.js.map
