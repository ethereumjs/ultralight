import {
  BitListType,
  ByteListType,
  ByteVectorType,
  ContainerType,
  ListBasicType,
  ListCompositeType,
  UintBigintType,
  UintNumberType,
  UnionType,
} from '@chainsafe/ssz'

import type { BitArray } from '@chainsafe/ssz'

export enum FoundContent {
  UTP = 0,
  CONTENT = 1,
  ENRS = 2,
}

export type PingPongCustomData = Uint8Array

// Wire Network Message Codes
export enum MessageCodes {
  PING = 0x00,
  PONG = 0x01,
  FINDNODES = 0x02,
  NODES = 0x03,
  FINDCONTENT = 0x04,
  CONTENT = 0x05,
  OFFER = 0x06,
  ACCEPT = 0x07,
}

// Type Aliases
export const ByteList = new ByteListType(2048)
export const Bytes2 = new ByteVectorType(2)
export const ENRs = new ListCompositeType(ByteList, 32)
/**
 * Numeric identifier which tells clients how the payload field should be decoded.
 */
export const PingPongPayloadType = new UintNumberType(2)

/**
 * SSZ encoded extension payload
 */
export const PingPongPayload = new ByteListType(1100)
export type PingMessage = {
  enrSeq: bigint
  payloadType: number
  customPayload: PingPongCustomData
}

export type PongMessage = {
  enrSeq: bigint
  payloadType: number
  customPayload: PingPongCustomData
}

export const PingMessageType = new ContainerType({
  enrSeq: new UintBigintType(8),
  payloadType: PingPongPayloadType,
  customPayload: PingPongPayload,
})

export const PongMessageType = new ContainerType({
  enrSeq: new UintBigintType(8),
  payloadType: PingPongPayloadType,
  customPayload: PingPongPayload,
})

export type FindNodesMessage = {
  distances: number[]
}

export const FindNodesMessageType = new ContainerType({
  distances: new ListBasicType(new UintNumberType(2), 256),
})

export type NodesMessage = {
  total: number
  enrs: Uint8Array[]
}

export const NodesMessageType = new ContainerType({
  total: new UintNumberType(1),
  enrs: ENRs,
})

export type FindContentMessage = {
  contentKey: Uint8Array
}

export const FindContentMessageType = new ContainerType({
  contentKey: ByteList,
})

export type ContentMessage = {
  selector: number
  value: connectionId | content | enrs
}

export type connectionId = Uint8Array

export type content = Uint8Array

export type enrs = Uint8Array[]

export const connectionIdType = new UintNumberType(2)
export const ContentMessageType = new UnionType([Bytes2, ByteList, ENRs])
export type OfferMessage = {
  contentKeys: Uint8Array[]
}

export const OfferMessageType = new ContainerType({
  contentKeys: new ListCompositeType(ByteList, 64),
})

export type Version = 0 | 1

export type AcceptMessage<V extends Version> = V extends 0
  ? {
      connectionId: Uint8Array
      contentKeys: BitArray
    }
  : V extends 1
    ? {
        connectionId: Uint8Array
        contentKeys: Uint8Array
      }
    : never

export const AcceptCodesType = new ByteListType(64)

export const AcceptMessageType: Record<Version, ContainerType<any>> = {
  0: new ContainerType({
    connectionId: Bytes2,
    contentKeys: new BitListType(64),
  }),
  1: new ContainerType({
    connectionId: Bytes2,
    contentKeys: AcceptCodesType,
  }),
}

export type MessageTypeUnion = [
  | PingMessage
  | PongMessage
  | FindNodesMessage
  | NodesMessage
  | FindContentMessage
  | ContentMessage
  | OfferMessage
  | AcceptMessage<Version>,
]
export const PortalWireMessageType: Record<Version, UnionType<any>> = {
  0: new UnionType([
    PingMessageType,
    PongMessageType,
    FindNodesMessageType,
    NodesMessageType,
    FindContentMessageType,
    ContentMessageType,
    OfferMessageType,
    AcceptMessageType[0],
  ]),
  1: new UnionType([
    PingMessageType,
    PongMessageType,
    FindNodesMessageType,
    NodesMessageType,
    FindContentMessageType,
    ContentMessageType,
    OfferMessageType,
    AcceptMessageType[1],
  ]),
}

export enum AcceptCode {
  ACCEPT = 0,
  GENERIC_DECLINE = 1,
  CONTENT_ALREADY_STORED = 2,
  CONTENT_OUT_OF_RADIUS = 3,
  RATE_LIMITED = 4,
  CONTENT_ID_LIMITED = 5,
}
