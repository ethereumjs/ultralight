import EventEmitter from 'events'
import debug, { Debugger } from 'debug'
import { RtcId, WebRTCPeer, NodeId, Offer } from '../index.js'
import { multiaddr, Multiaddr } from '@multiformats/multiaddr'
import { IPacket, encodePacket, decodePacket } from '@chainsafe/discv5/packet'
import { WakuPortal } from './waku.js'
import { SocketAddress } from '@chainsafe/discv5/lib/util/ip.js'
import { BaseENR } from '@chainsafe/discv5'

type SocketMessage = {
  userId: string
  data: string
}

interface IWebRTC {
  waku: WakuPortal
  log: Debugger
  nodeId: string
  rtcId: RtcId
  socket: WebSocket | undefined
  peers: Map<RtcId, WebRTCPeer>
  nodeIdToRtcId: Map<NodeId, RtcId>
  newPeer: () => Promise<WebRTCPeer>
  start: () => void
  channelConfig: (channel: RTCDataChannel) => void
  handleWakuMessage: (message: SocketMessage, type: string) => Promise<void>
  handleNewMember: (userId: string) => void
  handleOffer: (message: SocketMessage) => void
  handleAnswer: (message: SocketMessage) => void
  handleIce: (message: SocketMessage) => void
  sendMessage: (enr: string, message: string, to: string) => void
  close: () => void
  closeAll: () => void
}

export default class WebRTC extends EventEmitter implements IWebRTC {
  log: Debugger
  waku: WakuPortal
  nodeId: NodeId
  rtcId: RtcId
  socket: WebSocket | undefined
  peers: Map<RtcId, WebRTCPeer>
  nodeIdToRtcId: Map<NodeId, RtcId>
  constructor(nodeId: NodeId, waku: WakuPortal) {
    super()
    this.log = debug('Portal:RTC')
    this.nodeId = nodeId
    this.rtcId = nodeId
    this.peers = new Map()
    this.nodeIdToRtcId = new Map()
    this.waku = waku
  }

  newPeer = async (): Promise<WebRTCPeer> => {
    const rtcPeer = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:openrelay.metered.ca:80',
        },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
      ],
    })
    const sendChannel = rtcPeer.createDataChannel('0x' + this.nodeId, {
      protocol: 'HistoryNetwork',
      id: this.peers.size,
    })
    this.channelConfig(sendChannel)
    return {
      rtcPeer,
      sendChannel,
    }
  }

  async start() {
    await this.waku.start()
    this.waku.on('packet', (src, packet) => {
      this.emit('packet', src, packet)
    })
    this.waku.on('decodeError', (err, src) => {
      this.emit('decodeError', err, src)
    })
    this.waku.on('multiAddr', (src) => {
      this.emit('multiAddr', src)
    })
    this.waku.on('rtcMessage', (srcId, message) => {
      this.handleWakuMessage({ userId: srcId, data: message })
    })
  }

  getPeer = (id: string): WebRTCPeer | undefined => {
    const peer = this.peers.get(id)
      ? this.peers.get(id)
      : this.nodeIdToRtcId.get(id)
      ? this.peers.get(this.nodeIdToRtcId.get(id)!)
      : undefined
    return peer
  }

  async handleWakuMessage(message: { userId: string; data: string }): Promise<void> {
    const packet = JSON.parse(message.data)
    const packetData = JSON.parse(packet.data)
    switch (packet.type) {
      case 'Offer': {
        this.handleOffer({ userId: message.userId, data: (packetData as Offer).sdp! })
        break
      }
      case 'Answer': {
        this.handleAnswer({ userId: message.userId, data: (packetData as Offer).sdp! })
        break
      }
      case 'Ice': {
        this.handleIce({ userId: message.userId, data: packet.data })
        break
      }
      default: {
        throw new Error('Unknown message type: ' + packet.type)
      }
    }
  }

  channelConfig(channel: RTCDataChannel) {
    channel.binaryType = 'arraybuffer'
    channel.onmessage = (event) => {
      const dataChat1 = JSON.parse(event.data)
      this.log.extend('DATACHANNEL')(`Receieved message from ${dataChat1.userId.slice(0, 10)}`)
      if (dataChat1.type === 'message') {
        // To: nodeId, From: nodeId, Message: string
        this.emit('message', this.nodeId, dataChat1.userId, dataChat1.data)
        if (JSON.parse(dataChat1.data).address) {
          this.handleIncoming(dataChat1.data)
        }
      }
      if (dataChat1.type === 'handshake' && dataChat1.userId !== this.nodeId) {
        this.emit('handshake', dataChat1.userId, dataChat1.data)
        this.log.extend('DATACHANNEL').extend(channel.label.slice(0, 8)).extend('HANDSHAKE')(
          `${dataChat1.userId.slice(0, 10)}: ${dataChat1.data.slice(0, 10)}`
        )
        this.nodeIdToRtcId.set(dataChat1.userId, dataChat1.data)
      }
    }

    channel.onopen = () => {
      const chatData = {
        userId: this.nodeId,
        type: 'handshake',
        data: this.rtcId,
      }
      channel.send(JSON.stringify(chatData))
    }
  }

  async handleNewMember(userId: string) {
    if (userId === this.rtcId) {
      return
    }
    this.log.extend('NEW_MEMBER')(`Creating new RTC Peer Connection with ${userId.slice(0, 10)}`)
    const peer = await this.newPeer()
    peer.rtcPeer.ondatachannel = (e) => {
      peer.receiveChannel = e.channel
      this.channelConfig(peer.receiveChannel)
    }
    peer.rtcPeer.onicecandidate = (e) => {
      if (e.candidate) {
        const iceMessage = {
          userId: this.rtcId,
          type: 'Ice',
          data: JSON.stringify(e.candidate),
          toUid: userId,
        }
        this.log.extend('ICE')('Sending ICE message ' + `to ${userId.slice(0, 10)}`)
        this.waku.sendMessage(JSON.stringify(iceMessage), userId)
      }
    }
    peer.rtcPeer.onicecandidateerror = (event) => {
      this.log.extend('ICE')('Candidate Error: ' + JSON.stringify(event))
    }

    peer.rtcPeer.onicegatheringstatechange = (event) => {
      this.log.extend('ICE')('ICE_Gathering State Change:' + JSON.stringify(event))
    }

    peer.rtcPeer.oniceconnectionstatechange = (event) => {
      this.log.extend(userId.slice(0, 8)).extend('ICE')(
        'Connection State Change: ' + JSON.stringify(event)
      )
    }
    this.log.extend('HANDLE_NEW_MEMBER')(`Adding ${userId.slice(0, 10)} to RTC Routing Table`)
    this.peers.set(userId, peer)
    const offer = await peer.rtcPeer.createOffer()
    peer.rtcPeer.setLocalDescription(offer)

    const offerMessage = {
      userId: this.rtcId,
      type: 'Offer',
      data: JSON.stringify(offer),
      toUid: userId,
    }
    this.log.extend('HANDLE_NEW_MEMBER')(`sending OFFER to ${userId.slice(0, 10)}`)
    this.waku.sendMessage(JSON.stringify(offerMessage), userId)
  }

  async handleOffer(message: { userId: string; data: string }) {
    this.log.extend('HANDLE_OFFER')(
      `Creating new RTC Peer Connection with ${message.userId.slice(0, 10)} from OFFER message`
    )
    const peer = await this.newPeer()
    peer.rtcPeer.ondatachannel = (e) => {
      this.log.extend('DATACHANNEL')(`Opening Data Channel with ${message.userId.slice(0, 10)}`)
      const channel = e.channel
      this.channelConfig(channel)
      peer.receiveChannel = channel
    }
    peer.rtcPeer.onicecandidate = (e) => {
      this.log.extend('ICE')('candidate')
      if (e.candidate) {
        const iceMessage = {
          userId: this.rtcId,
          type: 'Ice',
          data: JSON.stringify(e.candidate),
          toUid: message.userId,
        }
        this.waku.sendMessage(JSON.stringify(iceMessage), message.userId)
      }
    }
    peer.rtcPeer.onicecandidateerror = (event) => {
      this.log.extend('ICE')('candidate error', JSON.stringify(event))
    }
    peer.rtcPeer.onicegatheringstatechange = (_event) => {
      this.log.extend('ICE')('gathering StateChange:')
    }

    peer.rtcPeer.oniceconnectionstatechange = (_event) => {
      this.log.extend('ICE')('connection state change')
    }
    this.log.extend(`HANDLE_OFFER`)(`Storing Peer connection with:  ${message.userId.slice(0, 10)}`)
    this.peers.set(message.userId, peer)
    // user offer to set remote description
    await peer.rtcPeer.setRemoteDescription({ type: 'offer', sdp: message.data })
    // create answer and use to set local description.  Send answer on websocket to remote peer
    const answer = await peer.rtcPeer.createAnswer()
    await peer.rtcPeer.setLocalDescription(answer)
    const answerMessage = {
      userId: this.rtcId,
      type: 'Answer',
      data: JSON.stringify(answer),
      toUid: message.userId,
    }
    this.log.extend('HANDLE_ANSWER')(`sending ANSWER to ${message.userId.slice(0, 10)}`)
    this.waku.sendMessage(JSON.stringify(answerMessage), message.userId)
  }

  async handleIce(message: { userId: string; data: string }) {
    this.log.extend('ICE')('got ICE message')
    const peer = this.peers.get(message.userId)
    try {
      await peer!.rtcPeer.addIceCandidate(new RTCIceCandidate(JSON.parse(message.data)))
      this.log.extend('ICE')('adding ice candidate')
    } catch (err) {
      this.log.extend('ICE')('Error adding ice candidate', (err as any).message)
    }
  }

  async handleAnswer(message: { userId: string; data: string }) {
    this.log.extend('HANDLE_ANSWER')(
      `Setting remote description for ${message.userId.slice(0, 10)}`
    )
    const peer = this.getPeer(message.userId)
    peer &&
      (await peer.rtcPeer.setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp: message.data })
      ))
  }

  async send(to: Multiaddr, toId: string, packet: IPacket) {
    this.log.extend('SEND')(`Sending packet to ${toId.slice(0, 10)}`)
    const peer = this.peers.get(toId)
    if (!peer) {
      return await this.waku.send(to, toId, packet)
    }
    const message = {
      address: to.toString(),
      buffer: encodePacket(toId, packet).toString('base64'),
    }
    this.sendMessage(Buffer.from(JSON.stringify(message)).toString('ascii'), toId)
  }

  sendMessage(message: string, to: string) {
    const peer = this.peers.get(to)
    if (!peer) {
      throw new Error()
    }
    const chatMessage = {
      userId: this.nodeId,
      type: 'message',
      data: message,
    }
    peer.sendChannel.readyState === 'open' && peer.sendChannel.send(JSON.stringify(chatMessage))
  }

  close() {
    this.socket?.close()
  }

  closeAll() {
    for (const peer of this.peers.values()) {
      peer.sendChannel!.close()
      peer.receiveChannel?.close()
      peer.rtcPeer.close()
    }
    this.close()
  }

  public async handleIncoming(data: string) {
    const message = JSON.parse(data)
    const multi = multiaddr(message.address)
    const packetBuf = Buffer.from(message.buffer, 'base64')
    try {
      const packet = decodePacket(this.nodeId, packetBuf)
      this.emit('packet', multi, packet)
    } catch (e) {
      this.emit('decodeError', e as Error, multi)
    }
  }
}
