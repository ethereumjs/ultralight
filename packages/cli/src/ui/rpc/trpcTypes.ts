import z from 'zod'

const bit = 2
const byte = 256

export const z_uint = (length: number) => z.number().min(bit ** length)
export const z_bytes = (length: number) => z.number().min(byte ** length)
export const z_hexString = (bytes?: number) => {
  return z
    .string()
    .transform((x) => (x.startsWith('0x') ? x.slice(2) : x))
    .refine((x) => !bytes || x.length === bytes * 2)
}

export const z_kBucket = z.array(z_bytes(32))
export const z_kBucketArray = z.array(z_kBucket)
export const z_DataRadius = z_hexString(32)
export const z_nodeId = z_hexString(32)
export const z_Enr = z.string().startsWith('enr:')
export const z_EnrSeq = z_hexString()
export const z_ipAddr = z.string()
export const z_socketAddr = z.string()
export const z_udpPort = z_uint(16)
export const z_isTcp = z.boolean()
export const z_distance = z.number()
export const z_RequestId = z_bytes(8)
export const z_ProtocolId = z.number().gte(0).lte(4)
export const z_Discv5Payload = z_hexString()
export const z_ContentKey = z_hexString()
export const z_Content = z_hexString()

export const z_ContentMessage = z.object({
  content: z_hexString(),
  utpTransfer: z.boolean().optional(),
})
export const z_ContentNodes = z.object({
  enrs: z.array(z_Enr),
})

export const z_NodesMessage = z.array(z_Enr)
export const z_PongMessage = z.object({
  enrSeq: z_EnrSeq,
  dataRadius: z_DataRadius,
})

export const z_AcceptResult = z.boolean()
export const z_SendAcceptResult = z_RequestId
export const z_AddEnrResult = z.boolean()
export const z_ContentResult = z.boolean()
export const z_SendContentResult = z_RequestId
export const z_DeleteEnrResult = z.boolean()
export const z_FindContentResult = z_ContentMessage
export const z_FindNodeResult = z_NodesMessage
export const z_LookupEnrResult = z_Enr.optional()
export const z_OfferResult = z.union([z.array(z.boolean()), z.undefined()])
export const z_SendOfferResult = z_hexString()
export const z_RecursiveFindContentResult = z_hexString()
export const z_RoutingTableInfoResult = z.object({
  localNodeId: z_bytes(32),
  buckets: z_kBucketArray,
})

export const z_NodeInfoResult = z.object({
  nodeId: z_hexString(32),
  enr: z_Enr,
})
export const z_historyRoutingTableInfoParams = z.array(z.never()).length(0)

export const z_historyAddEnrParams = z.array(z_Enr).length(1)
export const z_historyAddEnrsParams = z.array(z_Enr)
export const z_historyAddBootnodeParams = z.array(z_Enr).length(1)
export const z_historyLookupEnrParams = z.array(z_nodeId).length(1)
export const z_historyGetEnrParams = z.array(z_nodeId).length(1)
export const z_historyDeleteEnrParams = z.array(z_nodeId).length(1)

export const z_GetEnrResult = z_Enr

export const z_historyStoreParams = z.object({
  contentKey: z_ContentKey,
  content: z_Content,
})
export const z_historyLocalContentParams = z.object({
  contentKey: z_ContentKey,
})
export const z_historyPingParams = z.object({ enr: z_Enr })
export const z_historyFindNodesParams = z.object({
  enr: z_Enr,
  distances: z.array(z_distance),
})
export const z_historyFindContentParams = z.object({
  enr: z_Enr,
  contentKey: z_ContentKey,
})
export const z_historyRecursiveFindContentParams = z.object({
  contentKey: z_ContentKey,
})
export const z_historyOfferParams = z.object({
  enr: z_Enr,
  contentKey: z_ContentKey,
  content: z_Content,
})
export const z_historySendOfferParams = z.object({
  nodeId: z_nodeId,
  contentKeys: z.array(z_ContentKey),
})
export const z_historyGossipParams = z.object({
  contentKey: z_ContentKey,
  content: z_Content,
})

export const ui_port = z.object({ port: z.number() })

export const z_ui = (params: z.AnyZodObject) => {
  return ui_port.merge(params)
}

export const z_historyJSONContent = z.object({
  content: z.string(),
})

export const z_historyStoreResult = z.boolean()
export const z_historyLocalContentResult = z_Content
export const z_historyPingResult = z.union([z_PongMessage, z.undefined()])
export const z_historyFindNodesResult = z_NodesMessage
export const z_historyFindContentResult = z.union([
  z_ContentMessage,
  z_ContentNodes,
  z_historyJSONContent,
  z.undefined(),
])
export const z_historyRecursiveFindContentResult = z_historyFindContentResult
export const z_historyOfferResult = z_OfferResult
export const z_historySendOfferResult = z.object({
  result: z.union([z_SendOfferResult, z.undefined()]),
  response: z.union([z_OfferResult, z.undefined()]),
})
export const z_historyGossipResult = z.number()
