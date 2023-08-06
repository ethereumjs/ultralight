import {
  Bytes32TimeStamp,
  HeaderExtension,
  HeaderInput,
  ICreate,
  Packet,
  PacketOptions,
  PacketType,
  CongestionControl,
} from '../index.js'
import { Debugger } from 'debug'

export class PacketManager {
  logger: Debugger
  rcvConnectionId: number
  sndConnectionId: number
  congestionControl: CongestionControl
  updateWindow: () => void
  constructor(rcvConnectionId: number, sndConnectionId: number, logger: Debugger) {
    this.rcvConnectionId = rcvConnectionId
    this.sndConnectionId = sndConnectionId
    this.logger = logger.extend('PacketManager')
    this.congestionControl = new CongestionControl()
    this.updateWindow = () => this.congestionControl.updateWindow()
  }
  createPacket<T extends PacketType>(opts: ICreate<T>): Packet<T> {
    if (opts.extension === HeaderExtension.selectiveAck && !opts.bitmask) {
      throw new Error('Selective acks must have a bitmask')
    }
    const header: HeaderInput<T> = {
      ...opts,
      version: 1,
      timestampMicroseconds: Bytes32TimeStamp(),
      connectionId: opts.connectionId ?? this.rcvConnectionId,
      timestampDifferenceMicroseconds: this.congestionControl.reply_micro,
      wndSize: Math.min(
        2 ** 32 - 1,
        Math.abs(this.congestionControl.max_window - this.congestionControl.cur_window)
      ),
    }
    const options: PacketOptions<T> = {
      header,
      payload: opts.payload,
    }
    return Packet.fromOpts(options)
  }
}
