import { ContainerType, ByteVector, BigIntUintType, UnionType, ListType, byteType, NumberUintType, BitListType, ByteVectorType, Union, List } from "@chainsafe/ssz";


// Subnetwork IDs
export enum SubNetworkIds {
    StateNetwork = '0x500a',
    HistoryNetwork = '0x500b',
    TxGossipNetwork = '0x500c',
    HeaderGossipNetwork = '0x500d',
    CanonIndicesNetwork = '0x500e',
    UTPNetwork = '0x757470'
}

// Ping/Pong Custom Data type -- currently identical for State and History networks
export const PingPongCustomDataType = new ContainerType({
    fields: {
        radius: new BigIntUintType({ byteLength: 32 })
    }
})

// Wire Protocol Message Codes
export enum MessageCodes {
    PING = 0x00,
    PONG = 0x01,
    FINDNODES = 0x02,
    NODES = 0x03,
    FINDCONTENT = 0x04,
    CONTENT = 0x05,
    OFFER = 0x06,
    ACCEPT = 0x07
}

// Type Aliases
export const ByteList = new ListType({ limit: 2048, elementType: byteType })
export const Bytes2 = new ByteVectorType({ length: 2 })
export const ENRs = new ListType({ elementType: ByteList, limit: 32 })
export type PingMessage = {
    enrSeq: bigint
    customPayload: ByteVector
}

export type PongMessage = {
    enrSeq: bigint
    customPayload: ByteVector
}

export const PingMessageType = new ContainerType({
    fields: {
        enrSeq: new BigIntUintType({ byteLength: 8 }),
        customPayload: ByteList
    }
})


export const PongMessageType = new ContainerType({
    fields: {
        enrSeq: new BigIntUintType({ byteLength: 8 }),
        customPayload: ByteList
    }
})

export type FindNodesMessage = {
    distances: Uint16Array
}

export const FindNodesMessageType = new ContainerType({
    fields: {
        distances:
            new ListType({ elementType: new NumberUintType({ byteLength: 2 }), limit: 256 })
    }
})

export type NodesMessage = {
    total: number,
    enrs: Uint8Array[]
}

export const NodesMessageType = new ContainerType({
    fields: {
        total: byteType,
        enrs: ENRs
    }
})

export type FindContentMessage = {
    contentKey: Uint8Array
}

export const FindContentMessageType = new ContainerType({
    fields: {
        contentKey: ByteList
    }
})

export type ContentMessage = {
    content: Uint8Array | Uint8Array[]
}

export type connectionId = Uint8Array

export type content = Uint8Array

export type enrs = Uint8Array[]

export const ContentMessageType = new UnionType<Union<connectionId | content | enrs>>({
    types: [Bytes2, ByteList, ENRs]
})
export type OfferMessage = {
    contentKeys: Uint8Array[]
}

export const OfferMessageType = new ContainerType({
    fields: {
        contentKeys: new ListType({ elementType: ByteList, limit: 64 })
    }
})

export type AcceptMessage = {
    connectionId: Uint8Array,
    contentKeys: List<Boolean>
}

export const AcceptMessageType = new ContainerType({
    fields: {
        connectionId: Bytes2,
        contentKeys: new BitListType({ limit: 64 })
    }
})

export type MessageTypeUnion = | PingMessage | PongMessage | FindNodesMessage | NodesMessage | FindContentMessage | ContentMessage | OfferMessage | AcceptMessage
export const PortalWireMessageType = new UnionType<Union<MessageTypeUnion>>({ types: [PingMessageType, PongMessageType, FindNodesMessageType, NodesMessageType, FindContentMessageType, ContentMessageType, OfferMessageType, AcceptMessageType] })