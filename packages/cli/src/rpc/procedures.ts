import { ENR, HistoryProtocol, PortalNetwork, ProtocolId, toHexString } from 'portalnetwork'
import { PublicProcudure } from '../subscriptions.js'
import { z } from 'zod'
import jayson from 'jayson/promise/index.js'
import {
  z_RoutingTableInfoResult,
  z_historyFindContentParams,
  z_historyFindContentResult,
  z_historyFindNodesParams,
  z_historyFindNodesResult,
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
  z_ui,
} from './trpcTypes.js'
const bootnodes = [
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
export const httpProcedures = (publicProcedure: PublicProcudure, ip: string = '127.0.0.1') => {
  const httpClient = (port: number) => {
    return jayson.Client.http({
      host: ip,
      port: port,
    })
  }
  /**
   * HTTP Client Methods
   */

  /**
   * {@link portal_historyRoutingTableInfo}
   */
  const portal_historyRoutingTableInfo = publicProcedure
    .meta({
      description: 'Get Local Routing Table Info',
    })
    .input(z.object({ port: z.number() }))
    .output(z_RoutingTableInfoResult)
    .mutation(async ({ input }) => {
      const client = httpClient(input.port)
      const res = await client.request('portal_historyRoutingTableInfo', [])
      const routingTable = res.result
      return {
        localNodeId: routingTable.localNodeId,
        buckets: routingTable.buckets,
      }
    })

  const discv5_nodeInfo = publicProcedure
    .meta({
      description: 'Get ENR, NodeId, Client Tag, and MultiAddress',
    })
    .input(
      z.object({
        port: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const client = httpClient(input.port)
      const info = await client.request('discv5_nodeInfo', [])
      const enr = ENR.decodeTxt(info.result.enr)
      return {
        client: enr.kvs.get('c')?.toString(),
        enr: info.result.enr,
        nodeId: info.result.nodeId,
        multiAddr: (await enr.getFullMultiaddr('udp'))?.toString(),
      }
    })

  const portal_historyPing = publicProcedure
    .meta({
      description: 'Send Ping to ENR',
    })
    .input(z_ui(z_historyPingParams))
    .output(z_historyPingResult)
    .mutation(async ({ input }) => {
      const client = httpClient(input.port)
      const p = await client.request('portal_historyPing', [input.enr])
      const _pong = p.result
      const pong = _pong && {
        dataRadius: toHexString(_pong.dataRadius),
        enrSeq: _pong.enrSeq,
      }
      return pong
    })

  const pingBootNodeHTTP = publicProcedure
    .meta({
      description: 'Ping all BootNodes',
    })
    .input(
      z.object({
        port: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const client = httpClient(input.port)
      const pongs = []
      for await (const [idx, enr] of bootnodes.entries()) {
        const p = await client.request('portal_historyPing', [enr])
        const pongRes = p.result
        const pong = pongRes
          ? {
              tag: `${idx < 3 ? 'trin' : idx < 7 ? 'fluffy' : 'ultralight'}`,
              enr: `${enr.slice(0, 12)}`,
              customPayload: toHexString(pongRes.dataRadius),
              enrSeq: Number(pongRes.enrSeq),
            }
          : {
              tag: '',
              enr: ``,
              customPayload: '',
              enrSeq: -1,
            }
        pongs.push(pong)
      }
      return pongs
    })

  const portal_historyStore = publicProcedure
    .meta({
      description: 'Store Content',
    })
    .input(z_ui(z_historyStoreParams))
    .output(z_historyStoreResult)
    .mutation(async ({ input }) => {
      const res = await httpClient(input.port).request('portal_historyStore', [
        input.contentKey,
        input.content,
      ])
      return res.result
    })

  const portal_historyLocalContent = publicProcedure
    .meta({
      description: 'Get Content from local DB',
    })
    .input(z_ui(z_historyLocalContentParams))
    .output(z_historyLocalContentResult)
    .mutation(async ({ input }) => {
      const res = await httpClient(input.port).request('portal_historyLocalContent', [
        input.contentKey,
      ])
      return res.result
    })

  const portal_historyFindNodes = publicProcedure
    .meta({
      description: 'Find Nodes',
    })
    .input(z_ui(z_historyFindNodesParams))
    .output(z_historyFindNodesResult)
    .mutation(async ({ input }) => {
      const res = await httpClient(input.port).request('portal_historyFindNodes', [
        input.enr,
        input.distances,
      ])
      return res.result.enrs
    })

  const portal_historyFindContent = publicProcedure
    .meta({
      description: 'Find Content',
    })
    .input(z_ui(z_historyFindContentParams))
    .output(z_historyFindContentResult)
    .mutation(async ({ input }) => {
      const res = await httpClient(input.port).request('portal_historyFindContent', [
        input.enr,
        input.contentKey,
      ])
      return res.result
    })

  const portal_historyRecursiveFindContent = publicProcedure
    .meta({
      description: 'Recursive Find Content',
    })
    .input(z_ui(z_historyRecursiveFindContentParams))
    .output(z_historyRecursiveFindContentResult)
    .mutation(async ({ input }) => {
      const res = await httpClient(input.port).request('portal_historyRecursiveFindContent', [
        input.contentKey,
      ])
      return res.result
    })

  const portal_historyOffer = publicProcedure
    .meta({
      description: 'Offer Content',
    })
    .input(z_ui(z_historyOfferParams))
    .output(z_historyOfferResult)
    .mutation(async ({ input }) => {
      const res = await httpClient(input.port).request('portal_historyOffer', [
        input.enr,
        input.contentKey,
        input.content,
      ])
      return res.result
    })

  const portal_historySendOffer = publicProcedure
    .meta({
      description: 'Send Offer',
    })
    .input(z_ui(z_historySendOfferParams))
    .output(z_historySendOfferResult)
    .mutation(async ({ input }) => {
      const res = await httpClient(input.port).request('portal_historySendOffer', [
        input.nodeId,
        input.contentKeys,
      ])
      return res.result
    })

  const portal_historyGossip = publicProcedure
    .meta({
      description: 'Gossip Content',
    })
    .input(z_ui(z_historyGossipParams))
    .output(z_historyGossipResult)
    .mutation(async ({ input }) => {
      const res = await httpClient(input.port).request('portal_historyGossip', [
        input.contentKey,
        input.content,
      ])
      return res.result
    })

  return {
    portal_historyRoutingTableInfo,
    discv5_nodeInfo,
    pingBootNodeHTTP,
    portal_historyStore,
    portal_historyLocalContent,
    portal_historyPing,
    portal_historyFindNodes,
    portal_historyFindContent,
    portal_historyRecursiveFindContent,
    portal_historyOffer,
    portal_historySendOffer,
    portal_historyGossip,
  }
}
