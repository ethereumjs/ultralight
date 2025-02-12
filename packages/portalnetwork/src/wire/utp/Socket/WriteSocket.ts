import { NetworkNames } from '../../../networks/types.js'
import { ConnectionState, ContentWriter, PacketType, UtpSocketType, randUint16 } from '../index.js'

import { UtpSocket } from './UtpSocket.js'

import type { PortalNetworkMetrics } from '../../../client/types.js'
import type { ICreateData, UtpSocketOptions } from '../index.js'

export class WriteSocket extends UtpSocket {
  type: UtpSocketType.WRITE
  writer: ContentWriter | undefined
  constructor(options: UtpSocketOptions) {
    super(options)
    this.type = UtpSocketType.WRITE
    this.packetManager.congestionControl.on('write', async () => {
      await this.writer?.write()
    })
  }
  throttle(): void {
    this.packetManager.congestionControl.throttle()
  }
  updateRTT = (packetRtt: number, ackNr: number): void => {
    this.packetManager.congestionControl.updateRTT(packetRtt, ackNr)
  }
  updateWindow() {
    this.packetManager.updateWindow()
  }

  setWriter(seqNr: number) {
    this.writer = new ContentWriter(this, this.content, seqNr, this.logger)
    void this.writer.start()
  }
  async handleSynPacket(seqNr: number): Promise<void> {
    // This initiates a FINDCONTENT request.
    // Set a random seqNr and send a SYN-ACK.  Do not increment seqNr.
    // The first DATA packet will have the same seqNr.
    this.setAckNr(seqNr)
    const startingNr = randUint16()
    this.setSeqNr(startingNr)
    this.logger(`Setting seqNr to ${this.seqNr}.  Sending SYN-ACK`)
    await this.sendSynAckPacket()
    this.logger(`SYN-ACK sent.  Starting DATA stream.`)
    this.setWriter(startingNr)
  }
  async handleStatePacket(ackNr: number, timestamp: number): Promise<void> {
    if (ackNr === this.finNr) {
      await this.handleFinAck()
      return
    }
    this.updateAckNrs(ackNr)
    this.updateRTT(timestamp, ackNr)
    this.packetManager.updateWindow()
    this.logProgress()
    if (this.compare()) {
      await this.sendFinPacket()
      return
    }
    await this.writer!.write()
  }
  async handleFinPacket(): Promise<void> {
    this.state = ConnectionState.GotFin
    this.close()
  }
  compare(): boolean {
    if (!this.ackNrs.includes(undefined) && this.ackNrs.length === this.writer!.dataChunks.length) {
      return true
    }
    return false
  }
  close(): void {
    if (this.utp.client.metrics) {
      const metric = (NetworkNames[this.networkId] +
        '_utpWriteStreamsCompleted') as keyof PortalNetworkMetrics
      this.utp.client.metrics[metric].inc()
    }
    clearInterval(this.packetManager.congestionControl.timeoutCounter)
    this.packetManager.congestionControl.removeAllListeners()
    this._clearTimeout()
  }
  logProgress() {
    const needed = this.writer!.dataChunks.filter((n) => !this.ackNrs.includes(n[0])).map((n) => n[0])
    this.logger(
      `AckNr's received (${this.ackNrs.length}/${
        this.writer!.sentChunks.length
      }): ${this.ackNrs[0]?.toString()}...${
        this.ackNrs.slice(1).length > 3
          ? this.ackNrs.slice(this.ackNrs.length - 3)?.toString()
          : this.ackNrs.slice(1)?.toString()
      }`,
    )
    this.logger(`AckNr's needed (${needed.length}/${
      Object.keys(this.writer!.dataChunks).length
    }): ${needed.slice(0, 3)?.toString()}${
      needed.slice(3)?.length > 0 ? '...' + needed[needed.length - 1] : ''
    }
        `)
  }
  updateAckNrs(ackNr: number) {
    this.ackNrs = this.writer!.dataChunks.filter((n) => n[0] <= ackNr).map((n) => n[0])
  }
  async sendDataPacket(bytes: Uint8Array): Promise<void> {
    this.state = ConnectionState.Connected
    try {
      await this.packetManager.congestionControl.canSend()
    } catch (e) {
      this.logger(`DATA packet not acked.  Closing connection to ${this.remoteAddress}`)
      await this.sendResetPacket()
      this.close()
    }
    const packet = this.createPacket<PacketType.ST_DATA>({
      pType: PacketType.ST_DATA,
      payload: bytes,
    } as ICreateData)
    await this.sendPacket<PacketType.ST_DATA>(packet)
    this.packetManager.congestionControl.outBuffer.set(
      packet.header.seqNr,
      packet.header.timestampMicroseconds,
    )
    this.updateWindow()
  }
}
