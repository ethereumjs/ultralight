import { ENR } from '@chainsafe/discv5'

export type WebRTCPeer = {
  rtcPeer: RTCPeerConnection
  sendChannel: RTCDataChannel
  receiveChannel?: RTCDataChannel
}

export type RtcId = string
export type EnrString = string
export type UserId = string

export function enrToNodeId(enr: string) {
  return ENR.decodeTxt(enr).nodeId
}

export enum MessageType {
  UserId = 'UserId',
  Offer = 'Offer',
  Answer = 'Answer',
  NewMember = 'NewMember',
  Ice = 'Ice',
}

export const LOGIN_MESSAGE = JSON.stringify({
  type: 'Login',
  userId: '',
  data: '',
})

export type Offer = RTCSessionDescriptionInit
export type Answer = RTCSessionDescriptionInit
export type Ice = RTCIceCandidateInit
export type NewMember = string

export type SocketMessageData = Offer | Answer | Ice | UserId | NewMember

export interface ISocketMessage {
  userId: string
  type: MessageType
  data: string
  toUid: string
}

export class SocketMessage {
  userId: string
  type: MessageType
  data: SocketMessageData
  toUid: string
  static fromRaw(e: MessageEvent<any>): SocketMessage {
    const m = JSON.parse(e.data)
    const data =
      m.type === 'Offer'
        ? JSON.parse(m.data)
        : m.type === 'Answer'
        ? JSON.parse(m.data)
        : m.type === 'Ice'
        ? JSON.parse(m.data)
        : m.data
    return new SocketMessage({
      userId: m.userId,
      type: m.type,
      data,
      toUid: m.toUid,
    })
  }
  constructor(message: ISocketMessage) {
    this.userId = message.userId
    this.type = message.type
    this.data = message.data
    this.toUid = message.toUid
  }
}
