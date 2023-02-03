import debug, { Debugger } from 'debug'
import { EventEmitter } from 'events'
import { multiaddr as ma, Multiaddr } from '@multiformats/multiaddr'
import {
  decodePacket,
  encodePacket,
  IHandshakeAuthdata,
  IMessageAuthdata,
  IPacket,
  IWhoAreYouAuthdata,
} from '@chainsafe/discv5/packet'
import { ITransportEvents, ITransportService } from '@chainsafe/discv5'
import StrictEventEmitter from 'strict-event-emitter-types/types/src'
import { createLightNode } from '@waku/create'
import { ENR } from '../index.js'
import { bootstrap } from '@libp2p/bootstrap'
import {
  Encoder as EncoderV0,
  Decoder as DecoderV0,
  DecodedMessage,
} from '@waku/core/lib/message/version_0'
import { waitForRemotePeer } from '@waku/core'
import { Fleet, getPredefinedBootstrapNodes } from '@waku/core/lib/predefined_bootstrap_nodes'
import { IDecoder, LightNode, Protocols, SendResult } from '@waku/interfaces'
import { WakuMessage } from '@waku/proto'

class ChatMessage extends DecodedMessage {
  constructor(proto: WakuMessage) {
    super(proto)
  }
}

enum WakuStatus {
  Connecting = 'Connecting',
  Starting = 'Starting',
  Ready = 'Ready',
  None = 'None',
}

type AuthData = IHandshakeAuthdata | IMessageAuthdata | IWhoAreYouAuthdata

interface IWakuPortalEvents extends ITransportEvents {
  multiAddr: (src: Multiaddr) => void
  hello: (enr: string) => void
  newMessage: (msg: { timestamp: Date; text: string }) => void
  newPeer: (enr: string) => void
  shareEnr: () => Promise<void>
  packetInfo: (src: Multiaddr, authdata: AuthData, type: string, nonce: string) => void
  rtcMessage: (srcId: string, message: string) => void
}

declare type WakuPortalEventEmitter = StrictEventEmitter<EventEmitter, IWakuPortalEvents>
export class WakuPortal
  extends (EventEmitter as { new (): WakuPortalEventEmitter })
  implements ITransportService
{
  private log: Debugger
  public multiaddr: Multiaddr
  nodeId: string
  enr: ENR
  status: WakuStatus
  messages: ChatMessage[]
  sendCounter: number
  receiveCounter: number
  waku?: LightNode

  contentTopic: string
  decoder: IDecoder<ChatMessage>
  constructor(multiaddr: Multiaddr, enr: ENR) {
    //eslint-disable-next-line constructor-super
    super()
    this.log = debug('Portal').extend('WAKU')
    this.nodeId = enr.nodeId
    this.multiaddr = multiaddr
    this.enr = enr
    this.status = WakuStatus.None
    this.messages = []
    this.sendCounter = 0
    this.receiveCounter = 0

    this.contentTopic = '/PortalNetwork/'
    this.decoder = new DecoderV0(this.contentTopic + this.nodeId)
  }

  async start() {
    this.status = WakuStatus.Starting
    this.waku = await createLightNode({
      libp2p: {
        peerDiscovery: [bootstrap({ list: getPredefinedBootstrapNodes(Fleet.Prod) })],
      },
    })
    await this.waku.start()
    this.status = WakuStatus.Connecting
    await waitForRemotePeer(this.waku, [Protocols.LightPush, Protocols.Filter])
    this.status = WakuStatus.Ready
    this.deleteObserver()
  }

  async stop() {
    this.waku?.stop()
  }

  deleteObserver() {
    if (!this.waku) {
      return
    }
    this.waku.filter.subscribe(
      [this.decoder, new DecoderV0(this.contentTopic)],
      this.processIncomingMessage.bind(this)
    )
  }

  async processIncomingMessage(wakuMessage: DecodedMessage) {
    if (!wakuMessage.payload) return
    const payload = Buffer.from(wakuMessage.payload)

    const message = { text: payload.toString('ascii'), timestamp: wakuMessage.timestamp! }
    const m = JSON.parse(message.text)
    if (m.userId !== undefined) {
      this.emit('rtcMessage', m.userId, message.text)
    } else {
      m.address && (await this.handleIncoming(payload))
    }
    // }
  }

  async send(to: Multiaddr, toId: string, packet: IPacket) {
    const message = {
      address: to.toString(),
      buffer: encodePacket(toId, packet).toString('base64'),
    }
    this.sendMessage(Buffer.from(JSON.stringify(message)).toString('ascii'), toId)
  }

  public async handleIncoming(data: Uint8Array) {
    const message = JSON.parse(Buffer.from(data).toString('ascii'))
    const multi = ma(message.address)
    const packetBuf = Buffer.from(message.buffer, 'base64')
    try {
      const packet = decodePacket(this.nodeId, packetBuf)
      this.emit('packet', multi, packet)
    } catch (e) {
      this.emit('decodeError', e as Error, multi)
    }
  }

  async sendMessage(message: string, toId: string = ''): Promise<SendResult | undefined> {
    const payload = Uint8Array.from(Buffer.from(message, 'ascii'))
    const encoder = new EncoderV0(this.contentTopic + toId)
    return this.waku?.lightPush.push(encoder, { payload })
  }
}
