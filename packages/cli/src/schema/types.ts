export type bytes2 = number
export type bytes4 = number
export type bytes8 = number
export type bytes16 = number
export type bytes32 = number
export type bytes33 = number
export type hexString = string
export type uint = string

export type Bucket = bytes32[]
export type DataRadius = number
export type Enr = string
export type EnrSeq = number
export type ipAddr = string
export type kBuckets = Bucket[]
export type socketAddr = string
export type udpPort = string
export type isTcp = boolean | undefined
export type Distances = number
export type RequestId = bytes8
export type ProtocolId = number
export type Discv5Payload = hexString
export type ContentMessage = {
  connectionId: number
  content: hexString
  enrs: Enr[]
}
export type NodesMessage = Enr[]
export type PongMessage = {
  enrSeq: number
  dataRadius: DataRadius
}

export type AcceptResult = boolean
export type SendAcceptResult = RequestId
export type AddEnrResult = boolean
export type ContentResult = boolean
export type SendContentResult = RequestId
export type DeleteEnrResult = boolean
export type FindContentResult = ContentMessage
export type FindNodeResult = NodesMessage
export type GetEnrResult = Enr
export type LookupEnrResult = Enr
export type OfferResult = number
export type SendOfferResult = RequestId
export type PingResult = PongMessage
export type RecursiveFindNodeResult = Enr[]
export type RecursiveFindContentResult = hexString
export type RoutingTableInfoResult = {
  localNodeId: bytes32
  buckets: kBuckets
}
export type SendFindNodeResult = RequestId
export type SendNodesResult = number
export type SendPingResult = {
  requestId: RequestId
}
export type SendPongResult = boolean

export type NodeInfoResult = {}
export type SendTalkRequestResult = RequestId
export type SendTalkResponseResult = boolean
export type TalkResult = hexString

export type Result<T> = T
