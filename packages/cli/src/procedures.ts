import {
  ENR,
  ContentLookup,
  HistoryProtocol,
  PortalNetwork,
  ProtocolId,
  fromHexString,
  toHexString,
} from 'portalnetwork'
import { PublicProcudure } from './subscriptions.js'
import { z } from 'zod'
import {
  z_Enr,
  z_historyFindContentParams,
  z_historyFindContentResult,
  z_historyGossipParams,
  z_historyGossipResult,
  z_historyLocalContentParams,
  z_historyLocalContentResult,
  z_historyOfferParams,
  z_historyOfferResult,
  z_historyPingParams,
  z_historyPingResult,
  z_historyRecursiveFindContentParams,
  z_historyRecursiveFindContentResult,
  z_historySendOfferParams,
  z_historySendOfferResult,
  z_historyStoreParams,
  z_historyStoreResult,
} from './rpc/trpcTypes.js'
import { toJSON } from './util.js'
import { BitArray } from '@chainsafe/ssz'
const bootnodeENRs = [
  'enr:-I24QDy_atpK3KlPjl6X5yIrK7FosdHI1cW0I0MeiaIVuYg3AEEH9tRSTyFb2k6lpUiFsqxt8uTW3jVMUzoSlQf5OXYBY4d0IDAuMS4wgmlkgnY0gmlwhKEjVaWJc2VjcDI1NmsxoQOSGugH1jSdiE_fRK1FIBe9oLxaWH8D_7xXSnaOVBe-SYN1ZHCCIyg',
  'enr:-I24QIdQtNSyUNcoyR4R7pWLfGj0YuX550Qld0HuInYo_b7JE9CIzmi2TF9hPg-OFL3kebYgLjnPkRu17niXB6xKQugBY4d0IDAuMS4wgmlkgnY0gmlwhJO2oc6Jc2VjcDI1NmsxoQJal-rNlNBoOMikJ7PcGk1h6Mlt_XtTWihHwOKmFVE-GoN1ZHCCIyg',
  'enr:-I24QI_QC3IsdxHUX_jk8udbQ4U2bv-Gncsdg9GzgaPU95ayHdAwnH7mY22A6ggd_aZegFiBBOAPamkP2pyHbjNH61sBY4d0IDAuMS4wgmlkgnY0gmlwhJ31OTWJc2VjcDI1NmsxoQMo_DLYhV1nqAVC1ayEIwrhoFCcHvWuhC_J-w-n_4aHP4N1ZHCCIyg',
  'enr:-IS4QGUtAA29qeT3cWVr8lmJfySmkceR2wp6oFQtvO_uMe7KWaK_qd1UQvd93MJKXhMnubSsTQPJ6KkbIu0ywjvNdNEBgmlkgnY0gmlwhMIhKO6Jc2VjcDI1NmsxoQJ508pIqRqsjsvmUQfYGvaUFTxfsELPso_62FKDqlxI24N1ZHCCI40',
  'enr:-IS4QNaaoQuHGReAMJKoDd6DbQKMbQ4Mked3Gi3GRatwgRVVPXynPlO_-gJKRF_ZSuJr3wyHfwMHyJDbd6q1xZQVZ2kBgmlkgnY0gmlwhMIhKO6Jc2VjcDI1NmsxoQM2kBHT5s_Uh4gsNiOclQDvLK4kPpoQucge3mtbuLuUGYN1ZHCCI44',
  'enr:-IS4QBdIjs6S1ZkvlahSkuYNq5QW3DbD-UDcrm1l81f2PPjnNjb_NDa4B5x4olHCXtx0d2ZeZBHQyoHyNnuVZ-P1GVkBgmlkgnY0gmlwhMIhKO-Jc2VjcDI1NmsxoQOO3gFuaCAyQKscaiNLC9HfLbVzFdIerESFlOGcEuKWH4N1ZHCCI40',
  'enr:-IS4QM731tV0CvQXLTDcZNvgFyhhpAjYDKU5XLbM7sZ1WEzIRq4zsakgrv3KO3qyOYZ8jFBK-VzENF8o-vnykuQ99iABgmlkgnY0gmlwhMIhKO-Jc2VjcDI1NmsxoQMTq6Cdx3HmL3Q9sitavcPHPbYKyEibKPKvyVyOlNF8J4N1ZHCCI44',
  'enr:-IS4QFV_wTNknw7qiCGAbHf6LxB-xPQCktyrCEZX-b-7PikMOIKkBg-frHRBkfwhI3XaYo_T-HxBYmOOQGNwThkBBHYDgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQKHPt5CQ0D66ueTtSUqwGjfhscU_LiwS28QvJ0GgJFd-YN1ZHCCE4k',
  'enr:-IS4QDpUz2hQBNt0DECFm8Zy58Hi59PF_7sw780X3qA0vzJEB2IEd5RtVdPUYZUbeg4f0LMradgwpyIhYUeSxz2Tfa8DgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQJd4NAVKOXfbdxyjSOUJzmA4rjtg43EDeEJu1f8YRhb_4N1ZHCCE4o',
  'enr:-IS4QGG6moBhLW1oXz84NaKEHaRcim64qzFn1hAG80yQyVGNLoKqzJe887kEjthr7rJCNlt6vdVMKMNoUC9OCeNK-EMDgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQLJhXByb3LmxHQaqgLDtIGUmpANXaBbFw3ybZWzGqb9-IN1ZHCCE4k',
  'enr:-IS4QA5hpJikeDFf1DD1_Le6_ylgrLGpdwn3SRaneGu9hY2HUI7peHep0f28UUMzbC0PvlWjN8zSfnqMG07WVcCyBhADgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQJMpHmGj1xSP1O-Mffk_jYIHVcg6tY5_CjmWVg1gJEsPIN1ZHCCE4o',
]
const bootnodes = bootnodeENRs.map((b) => {
  const enr = ENR.decodeTxt(b)
  const tag = enr.kvs.get('c')
  const c = tag ? tag.toString() : ''
  const nodeId = enr.nodeId
  return {
    enr: b,
    nodeId,
    c,
  }
})
export const websocketProcedures = (portal: PortalNetwork, publicProcedure: PublicProcudure) => {
  const history = portal.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol

  const browser_nodeInfo = publicProcedure
    .meta({
      description: 'Get ENR, NodeId, Client Tag, and MultiAddress',
    })
    .mutation(() => {
      return {
        enr: portal.discv5.enr.encodeTxt(),
        nodeId: portal.discv5.enr.nodeId,
        client: 'ultralight',
        multiAddr: portal.discv5.enr.getLocationMultiaddr('udp')?.toString(),
      }
    })

  const local_routingTable = publicProcedure
    .meta({
      description: 'Get Local Routing Table',
    })
    .mutation(() => {
      return [...history.routingTable.buckets.entries()]
        .filter(([_, bucket]) => bucket.values().length > 0)
        .map(([idx, bucket]) => {
          return bucket
            .values()
            .map((enr) => [
              enr.kvs.get('c')?.toString() ?? '',
              enr.encodeTxt(),
              enr.nodeId,
              enr.getLocationMultiaddr('udp')!.toString(),
              idx,
            ])
        })
        .flat()
    })

  const ping = publicProcedure
    .meta({
      description: 'Send Ping to ENR',
    })
    .input(z_historyPingParams)
    .output(z_historyPingResult)
    .mutation(async ({ input }) => {
      const _pong = await history.sendPing(input.enr)
      const pong = _pong
        ? {
            enrSeq: '0x' + _pong.enrSeq.toString(16),
            dataRadius: toHexString(_pong.customPayload),
          }
        : undefined
      return pong
    })

  const pingBootNodes = publicProcedure
    .meta({
      description: 'Ping all BootNodes',
    })
    .output(
      z.array(
        z.object({
          enr: z_Enr,
          nodeId: z.string(),
          c: z.string(),
        }),
      ),
    )
    .mutation(async () => {
      for (const enr of bootnodes) {
        history.sendPing(enr.enr)
      }
      return bootnodes
    })

  const browser_historyStore = publicProcedure
    .meta({
      description: 'Store Content',
    })
    .input(z_historyStoreParams)
    .output(z_historyStoreResult)
    .mutation(async ({ input }) => {
      const key = fromHexString(input.contentKey)
      try {
        await history.store(key[0], toHexString(key.slice(1)), fromHexString(input.content))
      } catch {
        return false
      }
      const stored = await history.findContentLocally(key)
      return stored.length > 0
    })

  const browser_historyLocalContent = publicProcedure
    .meta({
      description: 'Get Local Content',
    })
    .input(z_historyLocalContentParams)
    .output(z_historyLocalContentResult)
    .mutation(async ({ input }) => {
      const contentKey = fromHexString(input.contentKey)
      const res = await history.findContentLocally(contentKey)
      return toJSON(contentKey, res)
    })

  const browser_historyFindContent = publicProcedure
    .meta({
      description: 'Find Content',
    })
    .input(z_historyFindContentParams)
    .output(z_historyFindContentResult)
    .mutation(async ({ input }) => {
      const contentKey = fromHexString(input.contentKey)
      const res = await history.sendFindContent(input.enr, contentKey)
      if (!res) return undefined

      switch (res?.selector) {
        case 0: {
          return { content: toJSON(contentKey, <Uint8Array>res.value) }
        }
        case 1: {
          return { enrs: (<Uint8Array[]>res.value).map(toHexString) }
        }
        default: {
          return undefined
        }
      }
    })

  const browser_historyRecursiveFindContent = publicProcedure
    .meta({
      description: 'Recursive Find Content',
    })
    .input(z_historyRecursiveFindContentParams)
    .output(z_historyRecursiveFindContentResult)
    .mutation(async ({ input }) => {
      const contentKey = fromHexString(input.contentKey)
      const lookup = new ContentLookup(history, contentKey)
      const res = await lookup.startLookup()
      return !res
        ? undefined
        : 'content' in res
        ? { content: toJSON(contentKey, res.content), utpTransfer: res.utp }
        : { enrs: res.enrs.map(toHexString) }
    })

  const browser_historyOffer = publicProcedure
    .meta({
      description: 'Offer Content',
    })
    .input(z_historyOfferParams)
    .output(z_historyOfferResult)
    .mutation(async ({ input }) => {
      const contentKey = fromHexString(input.contentKey)
      await history.store(
        contentKey[0],
        toHexString(contentKey.slice(1)),
        fromHexString(input.content),
      )
      const res = await history.sendOffer(input.enr, [contentKey])
      if (!res) return undefined
      if (res instanceof BitArray) {
        return res.toBoolArray()
      } else {
        return []
      }
    })

  const browser_historySendOffer = publicProcedure
    .meta({
      description: 'Send Offer',
    })
    .input(z_historySendOfferParams)
    .output(z_historySendOfferResult)
    .mutation(async ({ input }) => {
      const res = await history.sendOffer(input.nodeId, input.contentKeys.map(fromHexString))
      if (!res) {
        return {
          result: undefined,
          response: undefined,
        }
      } else {
        const enr = history.routingTable.getWithPending(input.nodeId)?.value
        const result = enr ? '0x' + enr.seq.toString(16) : undefined
        if (res instanceof BitArray) {
          return { result, response: res.toBoolArray() }
        } else {
          return { result, response: [] }
        }
      }
    })

  const browser_historyGossip = publicProcedure
    .meta({
      description: 'Gossip Content',
    })
    .input(z_historyGossipParams)
    .output(z_historyGossipResult)
    .mutation(async ({ input }) => {
      const res = await history.gossipContent(
        fromHexString(input.contentKey),
        fromHexString(input.content),
      )
      return res
    })

  const browser_ethGetBlockByHash = publicProcedure
    .meta({
      description: 'Get Block By Hash',
    })
    .input(
      z.object({
        blockHash: z.string(),
        includeTransactions: z.boolean(),
      }),
    )
    .output(
      z.union([
        z.undefined(),
        z.object({
          number: z.string(),
          hash: z.string(),
          parentHash: z.string(),
          nonce: z.string(),
          sha3Uncles: z.string(),
          logsBloom: z.string(),
          transactionsRoot: z.string(),
          stateRoot: z.string(),
          receiptsRoot: z.string(),
          miner: z.string(),
          difficulty: z.string(),
          totalDifficulty: z.string(),
          extraData: z.string(),
          size: z.string(),
          gasLimit: z.string(),
          gasUsed: z.string(),
          timestamp: z.string(),
          transactions: z.array(z.string()),
          uncles: z.array(z.string()),
        }),
        z.string(),
      ]),
    )
    .mutation(async ({ input }) => {
      const block = await history.ETH.getBlockByHash(input.blockHash, input.includeTransactions)
      if (!block) return undefined
      return JSON.stringify(block.toJSON())
    })

  const browser_ethGetBlockByNumber = publicProcedure
    .meta({
      description: 'Get Block By Number',
    })
    .input(
      z.object({
        blockNumber: z.string(),
        includeTransactions: z.boolean(),
      }),
    )
    .output(
      z.union([
        z.undefined(),
        z.object({
          number: z.string(),
          hash: z.string(),
          parentHash: z.string(),
          nonce: z.string(),
          sha3Uncles: z.string(),
          logsBloom: z.string(),
          transactionsRoot: z.string(),
          stateRoot: z.string(),
          receiptsRoot: z.string(),
          miner: z.string(),
          difficulty: z.string(),
          totalDifficulty: z.string(),
          extraData: z.string(),
          size: z.string(),
          gasLimit: z.string(),
          gasUsed: z.string(),
          timestamp: z.string(),
          transactions: z.array(z.string()),
          uncles: z.array(z.string()),
        }),
        z.string(),
      ]),
    )
    .mutation(async ({ input }) => {
      const block = await history.ETH.getBlockByNumber(
        BigInt(input.blockNumber),
        input.includeTransactions,
      )
      if (!block) return undefined
      return JSON.stringify(block.toJSON())
    })

  return {
    browser_nodeInfo,
    local_routingTable,
    ping,
    pingBootNodes,
    browser_historyStore,
    browser_historyLocalContent,
    browser_historyFindContent,
    browser_historyRecursiveFindContent,
    browser_historyOffer,
    browser_historySendOffer,
    browser_historyGossip,
    browser_ethGetBlockByHash,
    browser_ethGetBlockByNumber,
  }
}
